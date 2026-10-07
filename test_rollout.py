from detector import Detector, _tf
import numpy as np, torch, traceback
from PIL import Image

det = Detector()
print("grid:", det.grid)
print("blocks:", len(det._attn_blocks))

crop = (np.random.rand(256, 256, 3) * 255).astype(np.uint8)
x = _tf(Image.fromarray(crop)).unsqueeze(0)

try:
    h = det._rollout(x)
    print("rollout returned:", None if h is None else h.shape)
except Exception:
    traceback.print_exc()

print("\n--- diagnosing hook ---")
blk, attn, ln = det._attn_blocks[0]
print("attn class:", type(attn).__name__)
print("has in_proj_weight:", hasattr(attn, "in_proj_weight"))
print("num_heads:", getattr(attn, "num_heads", "MISSING"))
print("batch_first:", getattr(attn, "batch_first", "n/a"))

seen = {}
def probe(module, inp, out):
    seen["n_inputs"] = len(inp)
    if len(inp):
        t = inp[0]
        seen["shape"] = tuple(t.shape) if hasattr(t, "shape") else type(t).__name__
        seen["dim"] = t.dim() if hasattr(t, "dim") else None

hh = blk.register_forward_hook(probe)
det.model(x.to(det.dev))
hh.remove()
print("hook saw:", seen)