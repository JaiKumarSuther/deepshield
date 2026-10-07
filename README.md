# DeepFake Video Detection

A web-based deepfake video detection application powered by **ViT-L/14** (OpenCLIP) with a custom binary classification head. Upload a video and get a per-face authenticity verdict with attention heatmaps highlighting the regions the model focused on.

---

## ✨ Features

- **Frame-level analysis** — Samples up to 32 frames and scores each face crop independently.
- **Multi-face tracking** — Detects and tracks up to 4 faces per video using SCRFD + ArcFace identity embeddings.
- **Adaptive early stopping** — If the first 8 frames already agree strongly, the remaining 24 are skipped for faster results.
- **Attention rollout heatmaps** — Visualises which facial regions (eyes, mouth, jaw, etc.) influenced the prediction.
- **Region-level breakdown** — Reports per-region fakeness scores (forehead, eyes, nose, mouth, jaw, cheeks).
- **Compression warning** — Alerts users when video quality is too low for reliable detection.
- **Works on CPU & GPU** — Automatically uses CUDA when available; fully functional on CPU with multi-threaded inference.

---

## 🏗️ Architecture

| Component | Role |
|---|---|
| **ViT-L/14 (OpenCLIP)** | Backbone feature extractor (frozen) |
| **Custom `Net` head** | Linear classifier on normalised CLIP features |
| **SCRFD (`det_10g.onnx`)** | Face detection |
| **ArcFace (`w600k_r50.onnx`)** | Face identity embeddings for cross-frame tracking |
| **Flask** | Web server and REST API |

---

## 📋 Prerequisites

- **Python 3.9+**
- **pip** (or any Python package manager)
- **Node.js 20+** — only to build the frontend. A prebuilt `web/out/` runs without it.
- ~2 GB disk space for model weights

---

## 🚀 Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/naeemkhan988/DeepFake-Video-Detection.git
cd DeepFake-Video-Detection
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download model weights

The following model files are **not** included in this repository because they are too large for GitHub. Download them and place them in the project root directory:

| File | Size | Description |
|---|---|---|
| `ep14.pt` | ~1.2 GB | Fine-tuned ViT-L/14 classification weights |
| `det_10g.onnx` | ~16 MB | SCRFD face detection model |
| `w600k_r50.onnx` | ~174 MB | ArcFace identity recognition model |

> **Note:** Without these files the application will not start. Make sure all three files are in the same directory as `app.py`.

### 5. Build the frontend

The UI is a Next.js + Tailwind app in `web/`. It compiles to a static bundle that
Flask serves directly, so running the app stays a single command.

```bash
cd web
npm install
npm run build      # emits web/out/
cd ..
```

If `web/out/` is missing, Flask falls back to the original Jinja template, so the
app still runs without Node installed.

### 6. Run the application

```bash
python app.py
```

The server starts on **http://localhost:5000**. Open this URL in your browser.

---

## 🧑‍💻 Frontend development

For live reload while working on the UI, run the two servers side by side:

```bash
# terminal 1 — API
python app.py

# terminal 2 — UI with hot reload on http://localhost:3000
cd web
cp .env.local.example .env.local
npm run dev
```

`.env.local` points the browser at Flask on port 5000; Flask allows that origin in
development only. When you are done, `npm run build` regenerates `web/out/` and the
single-server setup picks the changes up.

---

## 🖥️ Usage

1. Open **http://localhost:5000** in your browser.
2. Upload a video file (`.mp4`, `.avi`, `.mov`, `.mkv`, or `.webm`). Max size: **200 MB**.
3. Wait for analysis to complete.
4. View the results:
   - **Verdict** — `LIKELY REAL` or `LIKELY FAKE` with a confidence score.
   - **Attention heatmaps** — Highlighted regions on face crops.
   - **Region breakdown** — Per-region scores for forehead, eyes, nose, mouth, jaw, and cheeks.
   - **Per-person breakdown** — If multiple faces are detected, each person gets a separate score.

---

## 🔌 API Reference

### `POST /analyse`

Upload a video for deepfake analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `video` — the video file

**Example (cURL):**
```bash
curl -X POST -F "video=@sample.mp4" http://localhost:5000/analyse
```

**Response (JSON):**
```json
{
  "score": 0.87,
  "verdict": "LIKELY FAKE",
  "confidence": 0.74,
  "per_frame": [0.82, 0.91, 0.85, "..."],
  "thumbs": [
    { "img": "data:image/jpeg;base64,...", "score": 0.91, "heat": "data:image/jpeg;base64,..." }
  ],
  "regions": ["mouth", "eyes", "jaw"],
  "spread": 0.08,
  "peak": 0.95,
  "frames_analysed": 32,
  "frames_checked": 8,
  "faces_found": 1,
  "people": [
    { "id": 1, "score": 0.87, "peak": 0.95, "spread": 0.08, "frames": 32,
      "per_frame": ["..."], "thumbs": ["..."], "regions": ["..."] }
  ],
  "duration": 12.5,
  "resolution": "1920x1080",
  "early_stop": true,
  "elapsed": 14.3,
  "warning": null
}
```

Notes on two fields that are easy to misread:

- `regions` is a **list of region names** the attention concentrated on — not
  per-region scores. Ordered most-attended first, at most three.
- `thumbs` is a list of **objects**, not bare strings. `heat` is present only on
  the frames an attention map was generated for (`HEATMAP_COUNT`, default 2).

Errors return HTTP 400 with `{"error": "..."}`; an over-size upload returns 413
with the same shape. The full response is typed in
[`web/lib/types.ts`](web/lib/types.ts).

---

## 📁 Project Structure

```
DeepFake-Video-Detection/
├── app.py              # Flask API + serves web/out (falls back to templates/)
├── detector.py         # Core detection logic (model, tracking, heatmaps)
├── requirements.txt    # Python dependencies
├── web/                # Next.js + Tailwind frontend
│   ├── app/            #   routes: /, /about, /how-it-works, /detect
│   ├── components/     #   result panel, frame chart, dropzone, ...
│   ├── lib/            #   API client + response types
│   └── out/            #   (generated) static build Flask serves
├── templates/
│   └── index.html      # Legacy UI, used only if web/out/ is absent
├── ep14.pt             # (download) Classification weights
├── det_10g.onnx        # (download) Face detection model
├── w600k_r50.onnx      # (download) ArcFace identity model
└── .gitignore
```

---

## ⚙️ Configuration

Key constants in `detector.py` that can be tuned:

| Constant | Default | Description |
|---|---|---|
| `FRAMES` | 32 | Number of frames sampled from the video |
| `DET_SIZE` | 320 | Face detector input resolution (lower = faster) |
| `HEATMAP_COUNT` | 2 | Number of heatmaps generated (more = slower) |
| `MAX_FACES` | 4 | Maximum faces tracked per video |
| `EARLY_LOW` / `EARLY_HIGH` | 0.30 / 0.70 | Confidence thresholds for early stopping |

---

## 🛠️ Tech Stack

- **Backend:** Python, Flask, PyTorch, OpenCLIP
- **Face Detection:** SCRFD (ONNX Runtime)
- **Face Recognition:** ArcFace (ONNX Runtime)
- **Frontend:** Next.js 16 (App Router, static export), React 19, Tailwind CSS v4, TypeScript, Motion
- **Inference:** CPU (multi-threaded) or CUDA GPU

---

## 📄 License

This project is for educational and research purposes.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.
