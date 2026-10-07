import base64
import os
import multiprocessing
import numpy as np, cv2, torch, torch.nn as nn, torch.nn.functional as F
import open_clip, onnxruntime as ort
from PIL import Image
from insightface.model_zoo import SCRFD
from torchvision import transforms as T

ort.set_default_logger_severity(3)

# PyTorch on CPU does not always use every core by default. On a laptop this
# is usually the single largest free speedup available.
try:
    _CORES = multiprocessing.cpu_count()
    torch.set_num_threads(max(1, _CORES))
    cv2.setNumThreads(max(1, _CORES))
except Exception:
    _CORES = 1

CROP, MARGIN, FRAMES = 256, 1.3, 32

# Face detector input size. 320 is more accurate on small or angled faces;
# 256 is noticeably faster on CPU. Drop to 256 if detection is the bottleneck
# and check the crops still look right.
DET_SIZE = 320

# Adaptive sampling: score every 4th frame first (8 of 32). If those agree
# strongly, stop there. Otherwise fall through and score the remaining 24.
FIRST_PASS_STRIDE = 4
EARLY_LOW, EARLY_HIGH = 0.30, 0.70
EARLY_MIN_FRAMES = 4

# Multi-face handling
MAX_FACES = 4
MIN_TRACK_FRAMES = 4
TRACK_TOL = 0.30       # position fallback radius, as a fraction of frame width
SIG_MATCH_ARC = 0.42   # ArcFace cosine similarity for "same person"
SIG_MATCH_PIX = 0.96   # fallback threshold when only the pixel signature exists
SIG_SIZE = 16

# Attention rollout. Each heatmap costs one extra full forward pass through
# ViT-L/14, so this is the main dial for response time on CPU.
ROLLOUT_DISCARD = 0.55
HEATMAP_ALPHA = 0.45
HEATMAP_COUNT = 2

CM = (0.48145466, 0.4578275, 0.40821073)
CS = (0.26862954, 0.26130258, 0.27577711)

# Must match the notebook preprocessing exactly, or the reported accuracy
# no longer applies to what this app actually does.
_tf = T.Compose([
    T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
    T.ToTensor(), T.Normalize(CM, CS)])

# Rough facial regions in normalised (x, y) coordinates of an aligned crop.
REGIONS = {
    "forehead":  (0.20, 0.05, 0.80, 0.28),
    "eyes":      (0.12, 0.28, 0.88, 0.45),
    "nose":      (0.32, 0.42, 0.68, 0.62),
    "mouth":     (0.25, 0.60, 0.75, 0.80),
    "jaw":       (0.15, 0.75, 0.85, 0.97),
    "cheeks":    (0.05, 0.42, 0.95, 0.70),
}


class Net(nn.Module):
    def __init__(s, b, d):
        super().__init__(); s.b, s.fc = b, nn.Linear(d, 1)
    def forward(s, x):
        f = F.normalize(s.b(x), dim=-1)
        return s.fc(f)[:, 0], f


class Detector:
    def __init__(self, weights="ep14.pt", onnx="det_10g.onnx",
                 rec_onnx="w600k_r50.onnx", device=None):
        self.dev = device or ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"device: {self.dev} ({_CORES} threads)")

        self.face = SCRFD(model_file=onnx)
        self.face.prepare(ctx_id=0 if self.dev == "cuda" else -1,
                          input_size=(DET_SIZE, DET_SIZE))

        # Identity embeddings, used only to match faces between frames.
        # Not part of the detection path, so a failure here degrades tracking
        # rather than breaking the app.
        self.rec = None
        if os.path.exists(rec_onnx):
            try:
                from insightface.model_zoo import ArcFaceONNX
                self.rec = ArcFaceONNX(model_file=rec_onnx)
                self.rec.prepare(ctx_id=0 if self.dev == "cuda" else -1)
            except Exception as e:
                print("recognition model failed to load:", type(e).__name__, e)
        print("face recognition:", "ok" if self.rec
              else "off (falling back to pixel signature)")

        clip_model, _, _ = open_clip.create_model_and_transforms(
            "ViT-L-14", pretrained="openai")
        vis = clip_model.visual.to(self.dev)
        with torch.no_grad():
            d = vis(torch.zeros(1, 3, 224, 224).to(self.dev)).shape[-1]
        self.model = Net(vis, d).to(self.dev)
        self.model.load_state_dict(torch.load(weights, map_location=self.dev))
        self.model.eval()
        print("model ready, feature dim", d)

        self.grid = self._install_attention_hooks(vis)
        print("attention hooks:", "ok" if self.grid else "unavailable")

    # --------------------------------------------------- attention plumbing

    def _install_attention_hooks(self, vis):
        """Locate the transformer blocks whose attention we can reconstruct.

        torch's MultiheadAttention only returns averaged weights when asked,
        and open_clip does not ask. Rather than patch the forward path the
        scores depend on, recompute the attention matrix from each block's
        input using its own q/k projection weights.
        """
        self._attn_blocks = []
        try:
            blocks = vis.transformer.resblocks
        except AttributeError:
            return 0
        for blk in blocks:
            attn = getattr(blk, "attn", None)
            ln = getattr(blk, "ln_1", None)
            if attn is None or ln is None or not hasattr(attn, "in_proj_weight"):
                return 0
            self._attn_blocks.append((blk, attn, ln))
        try:
            ps = vis.conv1.kernel_size[0]
            return 224 // ps
        except Exception:
            return 16

    @torch.no_grad()
    def _rollout(self, x):
        """Attention rollout for one image tensor of shape (1, 3, 224, 224).

        Abnar & Zuidema rollout: average heads, add the identity to stand in
        for residual connections, normalise rows, multiply the layers, then
        read the CLS row. Returns a (grid, grid) map or None.
        """
        if not self._attn_blocks or not self.grid:
            return None

        caught = []

        def make_hook(attn, ln):
            def hook(module, inp, out):
                t = inp[0]
                if t.dim() != 3:
                    return
                h = ln(t)
                # open_clip may run sequence-first (L, N, D) or batch-first
                # (N, L, D). Normalise before projecting, or the reshape
                # silently produces noise.
                if not getattr(attn, "batch_first", False):
                    h = h.transpose(0, 1)
                N, L, D = h.shape
                nh = attn.num_heads
                hd = D // nh
                qkv = torch.nn.functional.linear(
                    h, attn.in_proj_weight, attn.in_proj_bias)
                q, k, _ = qkv.chunk(3, dim=-1)
                q = q.reshape(N, L, nh, hd).permute(0, 2, 1, 3)
                k = k.reshape(N, L, nh, hd).permute(0, 2, 1, 3)
                a = torch.softmax((q @ k.transpose(-2, -1)) / (hd ** 0.5), dim=-1)
                caught.append(a[0].mean(0).float().cpu())
            return hook

        handles = [blk.register_forward_hook(make_hook(attn, ln))
                   for blk, attn, ln in self._attn_blocks]
        try:
            self.model(x.to(self.dev))
        finally:
            for h in handles:
                h.remove()

        mats = [m for m in caught if m is not None and m.dim() == 2]
        if not mats:
            return None

        n = mats[0].shape[-1]
        eye = torch.eye(n)
        result = eye.clone()
        for a in mats:
            if a.shape[-1] != n:
                continue
            if ROLLOUT_DISCARD > 0:
                flat = a.flatten().clone()
                k = int(flat.numel() * ROLLOUT_DISCARD)
                if k > 0:
                    idx = flat.topk(k, largest=False).indices
                    flat[idx] = 0
                    a = flat.reshape(a.shape)
            a = a + eye
            a = a / a.sum(dim=-1, keepdim=True).clamp(min=1e-8)
            result = a @ result

        cls = result[0, 1:]
        g = self.grid
        if cls.numel() < g * g:
            return None
        m = cls[:g * g].reshape(g, g).numpy()
        m = m - m.min()
        if m.max() > 1e-8:
            m = m / m.max()
        return m

    @staticmethod
    def _overlay(crop_rgb, heat, alpha=HEATMAP_ALPHA):
        h, w = crop_rgb.shape[:2]
        hm = cv2.resize(heat.astype(np.float32), (w, h),
                        interpolation=cv2.INTER_CUBIC)
        hm = np.clip(hm, 0, 1)
        colour = cv2.applyColorMap((hm * 255).astype(np.uint8), cv2.COLORMAP_JET)
        colour = cv2.cvtColor(colour, cv2.COLOR_BGR2RGB)
        a = (hm[..., None] * alpha)
        return np.clip(crop_rgb * (1 - a) + colour * a, 0, 255).astype(np.uint8)

    @staticmethod
    def _regions(heat, top_frac=0.20):
        g = heat.shape[0]
        thr = np.quantile(heat, 1 - top_frac)
        ys, xs = np.where(heat >= thr)
        if len(xs) == 0:
            return []
        px, py = xs / (g - 1), ys / (g - 1)
        hits = {}
        for name, (x0, y0, x1, y1) in REGIONS.items():
            inside = ((px >= x0) & (px <= x1) & (py >= y0) & (py <= y1)).sum()
            if inside:
                hits[name] = inside / len(xs)
        return [k for k, v in sorted(hits.items(), key=lambda kv: -kv[1])
                if v >= 0.15][:3]

    # ------------------------------------------------------- face detection

    def _detect_all(self, rgb):
        b, k = self.face.detect(rgb)
        if b is None or len(b) == 0:
            return []
        areas = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
        out = []
        for i in np.argsort(areas)[::-1][:MAX_FACES]:
            if b[i, 4] < 0.60:
                continue
            out.append((b[i, :4].astype(float), (k[i][0], k[i][1])))
        return out

    def _align_crop(self, img, pts, box):
        le, re = np.array(pts[0], float), np.array(pts[1], float)
        ang = np.degrees(np.arctan2(*(re - le)[::-1]))
        M = cv2.getRotationMatrix2D(tuple(((le + re) / 2).tolist()), ang, 1.0)
        rot = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]),
                             flags=cv2.INTER_CUBIC)
        x1, y1, x2, y2 = box
        cx, cy = M @ np.array([(x1 + x2) / 2, (y1 + y2) / 2, 1.0])
        s = max(x2 - x1, y2 - y1) * MARGIN / 2
        a, b = int(max(0, cx - s)), int(max(0, cy - s))
        p, q = int(min(rot.shape[1], cx + s)), int(min(rot.shape[0], cy + s))
        if p <= a or q <= b:
            return None
        return cv2.resize(rot[b:q, a:p], (CROP, CROP),
                          interpolation=cv2.INTER_CUBIC)

    # ------------------------------------------------------------- tracking

    @staticmethod
    def _centre(box):
        return np.array([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2])

    def _signature(self, crop_rgb):
        """Identity descriptor: ArcFace embedding, or a pixel fallback.

        Position alone splits a track whenever someone moves between sampled
        frames, and a low-res grayscale patch cannot reliably separate two
        different people. A 512-d ArcFace embedding handles both cases.
        """
        if self.rec is not None:
            try:
                bgr = cv2.cvtColor(cv2.resize(crop_rgb, (112, 112)),
                                   cv2.COLOR_RGB2BGR)
                v = np.asarray(self.rec.get_feat(bgr)).flatten().astype(np.float32)
                n = np.linalg.norm(v)
                if n > 1e-6:
                    return v / n, "arc"
            except Exception:
                pass
        g = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2GRAY)
        g = cv2.resize(g, (SIG_SIZE, SIG_SIZE),
                       interpolation=cv2.INTER_AREA).astype(np.float32)
        g = g - g.mean()
        v = g.flatten()
        n = np.linalg.norm(v)
        return (v / n, "pix") if n > 1e-6 else (None, None)

    def _assign(self, tracks, box, frame_w, crop=None):
        """Match a face to a track: identity first, position as fallback."""
        sig, kind = (None, None)
        if crop is not None:
            sig, kind = self._signature(crop)
        thr = SIG_MATCH_ARC if kind == "arc" else SIG_MATCH_PIX

        if sig is not None:
            best, best_s = None, -1.0
            for tid, t in tracks.items():
                if t.get("sig") is None or t.get("kind") != kind:
                    continue
                s = float(np.dot(sig, t["sig"]))
                if s > best_s:
                    best, best_s = tid, s
            if best is not None and best_s >= thr:
                m = 0.7 * tracks[best]["sig"] + 0.3 * sig
                n = np.linalg.norm(m)
                tracks[best]["sig"] = m / n if n > 1e-6 else m
                tracks[best]["last"] = self._centre(box)
                return best

        c = self._centre(box)
        tol = frame_w * TRACK_TOL
        best, best_d = None, tol
        for tid, t in tracks.items():
            d = float(np.linalg.norm(c - t["last"]))
            if d < best_d:
                best, best_d = tid, d
        if best is not None:
            tracks[best]["last"] = c
            if sig is not None and tracks[best].get("sig") is None:
                tracks[best]["sig"], tracks[best]["kind"] = sig, kind
            return best

        nid = len(tracks)
        tracks[nid] = {"crops": [], "last": c, "frames": [],
                       "sig": sig, "kind": kind}
        return nid

    def _collect(self, cap, indices, tracks, frame_w):
        checked = 0
        for i in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
            ok, fr = cap.read()
            if not ok:
                continue
            checked += 1
            rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
            for box, pts in self._detect_all(rgb):
                c = self._align_crop(rgb, pts, box)
                if c is None:
                    continue
                tid = self._assign(tracks, box, frame_w, crop=c)
                tracks[tid]["crops"].append(c)
                tracks[tid]["frames"].append(int(i))
        return checked

    def _merge_tracks(self, tracks):
        """Fold together tracks that clearly show the same person.

        Catches the case where two tracks were created early, before either
        had a stable descriptor to compare against.
        """
        merged = True
        while merged:
            merged = False
            ids = [t for t in tracks if tracks[t].get("sig") is not None]
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    a, b = ids[i], ids[j]
                    if tracks[a].get("kind") != tracks[b].get("kind"):
                        continue
                    thr = (SIG_MATCH_ARC if tracks[a].get("kind") == "arc"
                           else SIG_MATCH_PIX)
                    if float(np.dot(tracks[a]["sig"], tracks[b]["sig"])) >= thr:
                        tracks[a]["crops"] += tracks[b]["crops"]
                        tracks[a]["frames"] += tracks[b]["frames"]
                        del tracks[b]
                        merged = True
                        break
                if merged:
                    break
        return tracks

    # -------------------------------------------------------------- scoring

    def _score(self, crops):
        batch = torch.stack([_tf(Image.fromarray(c)) for c in crops]).to(self.dev)
        with torch.no_grad():
            logits, _ = self.model(batch)
            return torch.sigmoid(logits.float()).cpu().numpy()

    @staticmethod
    def _encode(img_rgb, size=112, quality=78):
        small = cv2.resize(img_rgb, (size, size), interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode(".jpg", cv2.cvtColor(small, cv2.COLOR_RGB2BGR),
                               [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not ok:
            return None
        return "data:image/jpeg;base64," + base64.b64encode(buf).decode()

    def _pick_thumbs(self, crops, scores, k=6, with_heat=True):
        mean = float(scores.mean())
        order = np.argsort(scores)[::-1] if mean > 0.5 else np.argsort(scores)
        out, region_votes = [], {}
        for rank, idx in enumerate(sorted(order[:k].tolist())):
            plain = self._encode(crops[idx])
            if plain is None:
                continue
            entry = {"img": plain, "score": float(scores[idx])}
            if with_heat and rank < HEATMAP_COUNT:
                x = _tf(Image.fromarray(crops[idx])).unsqueeze(0)
                heat = self._rollout(x)
                if heat is not None:
                    entry["heat"] = self._encode(self._overlay(crops[idx], heat))
                    for r in self._regions(heat):
                        region_votes[r] = region_votes.get(r, 0) + 1
            out.append(entry)
        regions = [r for r, _ in sorted(region_votes.items(),
                                        key=lambda kv: -kv[1])[:3]]
        return out, regions

    def _quality(self, path):
        """Bits per pixel per second — a rough proxy for compression level."""
        cap = cv2.VideoCapture(path)
        w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        n = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        cap.release()
        if not (w and h and n):
            return None, None
        secs = n / fps
        if secs <= 0:
            return None, None
        bpp = os.path.getsize(path) * 8 / secs / (w * h)
        return bpp, (int(w), int(h))

    # -------------------------------------------------------------- predict

    def predict(self, path):
        import time
        t0 = time.time()

        cap = cv2.VideoCapture(path)
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        frame_w = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640
        if n <= 0:
            cap.release()
            return {"error": "Could not read the video file."}

        all_idx = np.linspace(0, n - 1, min(FRAMES, n), dtype=int)
        first_idx = all_idx[::FIRST_PASS_STRIDE]
        rest_idx = np.setdiff1d(all_idx, first_idx)

        tracks = {}
        checked = self._collect(cap, first_idx, tracks, frame_w)

        early = False
        main = max(tracks.values(), key=lambda t: len(t["crops"]), default=None)
        if main and len(main["crops"]) >= EARLY_MIN_FRAMES:
            s = self._score(main["crops"])
            if s.max() < EARLY_LOW or s.min() > EARLY_HIGH:
                early = True

        if not early and len(rest_idx):
            checked += self._collect(cap, rest_idx, tracks, frame_w)

        cap.release()
        tracks = self._merge_tracks(tracks)

        people = []
        for tid in sorted(tracks):
            t = tracks[tid]
            if len(t["crops"]) < MIN_TRACK_FRAMES:
                continue
            sc = self._score(t["crops"])
            people.append({
                "id": len(people) + 1,
                "score": float(sc.mean()),
                "peak": float(sc.max()),
                "spread": float(sc.std()),
                "frames": len(t["crops"]),
                "per_frame": [float(x) for x in sc],
                "_crops": t["crops"],
                "_scores": sc,
            })

        if not people:
            total = sum(len(t["crops"]) for t in tracks.values())
            return {"error": f"Only {total} usable face crops found across "
                             f"{checked} frames. Need at least "
                             f"{MIN_TRACK_FRAMES} for one person. Is there a "
                             "clear face in this video?"}

        people.sort(key=lambda p: p["score"], reverse=True)

        for i, p in enumerate(people):
            thumbs, regions = self._pick_thumbs(
                p["_crops"], p["_scores"], with_heat=(i == 0))
            p["thumbs"] = thumbs
            p["regions"] = regions
            del p["_crops"], p["_scores"]

        lead = people[0]
        score = lead["score"]
        bpp, dims = self._quality(path)

        warn = None
        if bpp is not None:
            if bpp < 0.015:
                warn = ("This video is very heavily compressed. Detection accuracy "
                        "falls sharply at this quality — treat the result as unreliable.")
            elif bpp < 0.03:
                warn = ("This video is heavily compressed. Accuracy drops on "
                        "low-quality video, so treat this result with caution.")

        elapsed = round(time.time() - t0, 1)
        print(f"[predict] {os.path.basename(path)} — {elapsed}s, "
              f"{checked} frames, {len(people)} subject(s), early_stop={early}")

        return {
            "score": score,
            "verdict": "LIKELY FAKE" if score > 0.5 else "LIKELY REAL",
            "confidence": abs(score - 0.5) * 2,
            "per_frame": lead["per_frame"],
            "thumbs": lead["thumbs"],
            "regions": lead["regions"],
            "spread": lead["spread"],
            "peak": lead["peak"],
            "frames_analysed": lead["frames"],
            "frames_checked": checked,
            "faces_found": len(people),
            "people": people,
            "duration": round(n / fps, 1),
            "resolution": f"{dims[0]}x{dims[1]}" if dims else None,
            "early_stop": bool(early),
            "elapsed": elapsed,
            "warning": warn,
        }