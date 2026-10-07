# Deployment Audit: DeepShield (DeepFake Video Detection)

**Audit Date:** 2026-10-06  
**Repository Root:** `c:\Users\iamja\Desktop\FYP\DeepFake-Video-Detection`  
**Purpose:** Technical inventory of current repository state, build systems, runtime dependencies, model integration, file handling, and infrastructure configs.

---

## 1. Project Structure

### Top-Level Directory Tree (2 Levels Deep)

```
DeepFake-Video-Detection/
├── .git/                                 # Git version control metadata
├── .gitignore                            # Root ignore rules (venv, cache, *.pt, *.onnx, uploads)
├── README.md                             # Project overview, architecture, setup guide
├── __pycache__/                          # Python bytecode cache (gitignored)
├── app.py                                # Flask backend application and static file server
├── detector.py                           # Core inference engine, face detection, tracking, rollout
├── det_10g.onnx                          # SCRFD face detection ONNX model (gitignored, present locally)
├── ep14.pt                               # ViT-L/14 classification head weights (gitignored, present locally)
├── models/                               # Local folder holding model copies (gitignored, untracked)
│   ├── det_10g.onnx                      # Duplicate SCRFD model
│   └── w600k_r50.onnx                    # Duplicate ArcFace model
├── requirements.txt                      # Python dependency list
├── static/                               # Legacy static assets
│   └── html2canvas.min.js                # Bundled html2canvas library for legacy HTML template
├── templates/                            # Legacy Flask Jinja templates
│   └── index.html                        # Pre-migration monolithic HTML/CSS/JS interface
├── test_rollout.py                       # Standalone diagnostic test script for attention hooks
├── uploads/                              # Temporary directory for video uploads during inference
├── venv/                                 # Python virtual environment (gitignored, untracked)
├── w600k_r50.onnx                        # ArcFace identity model (gitignored, present locally)
└── web/                                  # Next.js frontend application root
    ├── .env.local                        # Local dev env file (gitignored, present locally)
    ├── .env.local.example                # Example environment file
    ├── .gitignore                        # Web-specific gitignore rules
    ├── .next/                            # Next.js build cache and output (gitignored)
    ├── app/                              # Next.js App Router source
    │   ├── about/                        # Route: /about/
    │   ├── detect/                       # Route: /detect/
    │   ├── globals.css                   # Global styles and Tailwind tokens
    │   ├── how-it-works/                 # Route: /how-it-works/
    │   ├── icon.svg                      # Application icon
    │   ├── layout.tsx                    # Root HTML layout and font loading
    │   └── page.tsx                      # Route: / (landing page)
    ├── components/                       # 17 React UI components
    │   ├── crop-gallery.tsx
    │   ├── detect-workbench.tsx
    │   ├── dropzone.tsx
    │   ├── face-cloud.tsx
    │   ├── frame-timeline.tsx
    │   ├── hero.tsx
    │   ├── marquee.tsx
    │   ├── pipeline-progress.tsx
    │   ├── pipeline-scroll.tsx
    │   ├── result-panel.tsx
    │   ├── site-footer.tsx
    │   ├── site-nav.tsx
    │   ├── smooth-scroll.tsx
    │   ├── subject-list.tsx
    │   ├── theme-toggle.tsx
    │   ├── ui.tsx
    │   └── verdict-meter.tsx
    ├── lib/                              # Client utilities and types
    │   ├── api.ts                        # API fetch client and validation
    │   └── types.ts                      # TypeScript interfaces matching backend response
    ├── next-env.d.ts                     # Next.js TypeScript declarations (gitignored)
    ├── next.config.mjs                   # Next.js configuration
    ├── node_modules/                     # Node dependencies (gitignored)
    ├── out/                              # Static export directory emitted by next build (gitignored)
    ├── package-lock.json                 # npm dependency lockfile
    ├── package.json                      # npm package manifest and scripts
    ├── postcss.config.mjs                # PostCSS configuration for Tailwind v4
    ├── tsconfig.json                     # TypeScript compiler options
    └── tsconfig.tsbuildinfo              # TypeScript build cache (gitignored)
```

### Router & Rendering Mode
- **Router:** Next.js **App Router** is used exclusively, located in [`web/app`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/app). There is no `pages/` directory.
- **Rendering Mode:** **Static HTML Export (SSG)**. Configured via `output: "export"` in [`web/next.config.mjs:13`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/next.config.mjs#L13).
- **Export Destination:** Emits to [`web/out/`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/out).
- **Server-Side Rendering (SSR) / Server Actions / ISR:** None. No Next.js Node server runs in production.

### Leftover Files & Route Conflicts from Old HTML/CSS Version
- **Legacy Files Present:**
  - [`templates/index.html`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/templates/index.html) (50,262 bytes, 1,680 lines): Contains the complete prior monolithic single-page interface with embedded CSS and vanilla JavaScript.
  - [`static/html2canvas.min.js`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/static/html2canvas.min.js) (198,708 bytes): Bundled JavaScript library for client-side report exports used by [`templates/index.html:14`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/templates/index.html#L14). The Next.js frontend instead uses the npm package `html2canvas-pro` ([`web/components/result-panel.tsx:41`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/components/result-panel.tsx#L41)).
- **Conditional Serving & Fallback in [`app.py`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py):**
  - Line 8: `WEB_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "out")`
  - Line 9: `HAS_BUILD = os.path.isdir(WEB_OUT)`
  - Lines 36–40: Route `/` serves `web/out/index.html` if `HAS_BUILD` is true, otherwise falls back to `render_template("index.html")`.
- **Route Conflicts & Inconsistencies:**
  - **Dynamic Route Registration:** Catch-all route `/<path:page>` in [`app.py:70-87`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L70-L87) is defined inside `if HAS_BUILD:`. If Flask starts when `web/out/` does not exist, `/<path:page>` is never registered on the Flask app. Later generating `web/out/` without restarting `app.py` leaves subroutes (`/about/`, `/detect/`, `/how-it-works/`) returning 404.
  - **Static Namespace Conflict:** Flask automatically registers the endpoint `/static/<path:filename>` mapped to the root directory `static/` upon calling `Flask(__name__)` ([`app.py:15`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L15)). Any request matching `/static/*` will be handled by Flask's built-in handler pointing to root `static/`, bypassing `web/out/`. (Next.js static assets reside under `/_next/`, so they avoid this collision in practice).
  - **Duplicate Model Files:** Directory [`models/`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/models) exists locally containing [`models/det_10g.onnx`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/models/det_10g.onnx) (16,923,827 bytes) and [`models/w600k_r50.onnx`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/models/w600k_r50.onnx) (174,383,860 bytes), but [`detector.py:77-78`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L77-L78) references `./det_10g.onnx` and `./w600k_r50.onnx` in the root directory. Nothing in the codebase references the `models/` subdirectory.

---

## 2. Runtime & Build

### Node & Package Manager
- **Node Version Requirement:**
  - `engines` field in [`web/package.json`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package.json): **Absent**.
  - `.nvmrc`: **Absent**.
  - `.node-version`: **Absent**.
  - Reference in documentation: [`README.md:35`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/README.md#L35) documents `- **Node.js 20+** — only to build the frontend`, but this is not enforced in configuration.
- **Package Manager in Use:**
  - `npm` (evidenced by [`web/package-lock.json`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package-lock.json), lockfileVersion 3, 64,138 bytes).
  - No `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb` exists in the repository.
- **Next.js Version:**
  - `"next": "^16.3.1"` in [`web/package.json:15`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package.json#L15).
  - Accompanied by `"react": "^19.2.8"` and `"react-dom": "^19.2.8"`.

### Build & Start Commands
- **Frontend Build Command:**
  - Defined in [`web/package.json:7`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package.json#L7): `"build": "next build"`.
  - Invocation: `npm run build` (executed within directory `web/`).
- **Frontend Development Command:**
  - Defined in [`web/package.json:6`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package.json#L6): `"dev": "next dev -p 3000"`.
- **Frontend Typecheck Command:**
  - Defined in [`web/package.json:8`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package.json#L8): `"typecheck": "tsc --noEmit"`.
- **Frontend Start Command:**
  - Defined in [`web/package.json`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/package.json): **None** (there is no `"start"` script).
- **Backend / Production Start Command:**
  - `python app.py` (initiates Flask via `app.run(debug=False, host="0.0.0.0", port=5000)` in [`app.py:91`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L91)).

### `next.config.mjs` Settings
Settings declared in [`web/next.config.mjs`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/next.config.mjs):
- `turbopack: { root: here }` (restricts root path resolution to prevent searching parent directories).
- `output: "export"` (generates static HTML files into `web/out/`).
- `trailingSlash: true` (ensures routes export as `<route>/index.html` matching Flask path resolution).
- `images: { unoptimized: true }` (disables default Node-based image optimization).
- `agentRules: false` (suppresses Next.js 16 automatic generation of AGENTS.md / CLAUDE.md files).
- `rewrites`: **None**.
- `redirects`: **None**.
- `headers`: **None**.
- `images.remotePatterns` / `domains`: **None**.

---

## 3. Model Integration

### Inference Architecture
- **Inference Location:** In-process call inside the Python Flask application.
  - Endpoint `POST /analyse` in [`app.py:43-63`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L43-L63) synchronously invokes `det.predict(path)`.
  - Inference is **not** hosted in a Next.js API route (no API routes exist in `web/app/`).
  - Inference is **not** a subprocess call (no `subprocess.run`/`Popen`).
  - Inference does **not** call an external third-party API.

### Model Frameworks & File Formats
The pipeline in [`detector.py`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py) combines three distinct models:
1. **Face Detection:**
   - Architecture: SCRFD.
   - Format: **ONNX** (`det_10g.onnx`).
   - Framework / Runtime: `insightface.model_zoo.SCRFD` backed by `onnxruntime` ([`detector.py:7, 82-84`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L7-L84)).
2. **Face Recognition & Tracking:**
   - Architecture: ArcFace (ResNet-50 backbone).
   - Format: **ONNX** (`w600k_r50.onnx`).
   - Framework / Runtime: `insightface.model_zoo.ArcFaceONNX` backed by `onnxruntime` ([`detector.py:92-94`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L92-L94)).
   - Fallback: If `w600k_r50.onnx` is missing or fails to initialize, code falls back to a 16×16 normalized grayscale pixel signature ([`detector.py:97-98, 295-301`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L97-L301)).
3. **Feature Extraction Backbone:**
   - Architecture: CLIP ViT-L/14 (visual transformer).
   - Format: PyTorch model weights pulled via `open_clip.create_model_and_transforms("ViT-L-14", pretrained="openai")` ([`detector.py:100-102`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L100-L102)).
4. **Classification Head:**
   - Architecture: Custom `Net` module with a linear layer `nn.Linear(d, 1)` operating on normalized CLIP visual features ([`detector.py:68-73, 105`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L68-L105)).
   - Format: **PyTorch Checkpoint** (`ep14.pt`), loaded via `torch.load(weights, map_location=self.dev)` ([`detector.py:106`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L106)).

### Model File Sizes & Storage
- **`ep14.pt`:**
  - Size: **1,215,962,075 bytes** (~1.22 GB / ~1.13 GiB).
  - Storage: Stored locally in root directory. Excluded from git via [.gitignore:11](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/.gitignore#L11) (`*.pt`).
- **`det_10g.onnx`:**
  - Size: **16,923,827 bytes** (~16.9 MB / ~16.1 MiB).
  - Storage: Stored locally in root directory (and duplicated in `models/`). Excluded from git via [.gitignore:12](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/.gitignore#L12) (`*.onnx`).
- **`w600k_r50.onnx`:**
  - Size: **174,383,860 bytes** (~174.4 MB / ~166.3 MiB).
  - Storage: Stored locally in root directory (and duplicated in `models/`). Excluded from git via [.gitignore:12](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/.gitignore#L12) (`*.onnx`).
- **OpenCLIP Backbone (`ViT-L-14`):**
  - Size: ~1.7 GB (downloaded into Hugging Face / OpenCLIP cache directory, e.g., `~/.cache/clip`).
  - Storage: Not stored in repository. Downloaded on first run at runtime from OpenAI/Hugging Face repository.
- **External Storage Links (S3 / HF Hub):**
  - No S3 bucket, GCP bucket, Hugging Face Hub download logic, or automated fetch script exists in code.
  - [`README.md:67-77`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/README.md#L67-L77) states these files must be downloaded and manually placed in root, but does not specify download URLs.

### Python Dependencies & Python Version
- **Dependencies ([`requirements.txt`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/requirements.txt)):**
  ```text
  flask==3.0.3
  torch
  torchvision
  open_clip_torch
  insightface
  onnxruntime
  opencv-python-headless
  numpy
  pillow
  ```
  *(Note: All dependencies except `flask` are unpinned).*
- **Python Version:**
  - No version pinned in repository manifests (no `.python-version`, `runtime.txt`, `pyproject.toml`, or `Pipfile`).
  - [`README.md:33`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/README.md#L33) specifies `Python 3.9+`.
  - Local virtual environment uses Python `3.10.11` ([`venv/pyvenv.cfg:3`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/venv/pyvenv.cfg#L3)).

### Hardware Execution (CPU vs GPU)
- **Device Selection ([`detector.py:79`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L79)):**
  `self.dev = device or ("cuda" if torch.cuda.is_available() else "cpu")`
- **ONNX Execution Provider ([`detector.py:83, 94`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L83-L94)):**
  `ctx_id=0 if self.dev == "cuda" else -1`
- **CPU Multi-threading ([`detector.py:14-19`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L14-L19)):**
  ```python
  _CORES = multiprocessing.cpu_count()
  torch.set_num_threads(max(1, _CORES))
  cv2.setNumThreads(max(1, _CORES))
  ```
- **Inference Mode:** Runs on CPU by default when CUDA is absent. Can utilize GPU if CUDA-enabled PyTorch is installed. `requirements.txt` specifies CPU `onnxruntime` rather than `onnxruntime-gpu`.

### Inference Duration & Video Constraints
- **Frame Sampling:** Fixed at up to `32` frames (`FRAMES = 32`, [`detector.py:21, 456`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L21-L456)), sampled evenly across the entire video: `np.linspace(0, n - 1, min(FRAMES, n))`.
- **Adaptive Sampling (Early Stopping):** Evaluates every 4th frame (8 frames) first ([`detector.py:30, 457`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L30-L457)). If max score `< 0.30` or min score `> 0.70` ([`detector.py:31, 467`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L31-L467)), inference halts early and returns without scoring the remaining 24 frames.
- **Attention Rollout Heatmaps:** Reconstructs transformer attention for the top `2` crops (`HEATMAP_COUNT = 2`, [`detector.py:46, 414`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L46-L414)), adding two additional forward passes through ViT-L-14 with forward hooks.
- **Inference Time:** Logged in [`detector.py:522-524`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L522-L524); documentation example reports ~14.3 seconds ([`README.md:175`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/README.md#L175)). Actual duration varies depending on whether early stopping triggers and CPU core availability.
- **Maximum Video Duration:** No upper duration limit enforced in code. The video duration is calculated as `n / fps` ([`detector.py:539`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L539)) and all durations are accepted provided `n > 0`.
- **Maximum Accepted Video Size:** **200 MB** (enforced at [`app.py:16`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L16), [`web/lib/api.ts:10`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/lib/api.ts#L10), and [`templates/index.html:939`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/templates/index.html#L939)).
- **Accepted File Extensions:**
  - Backend ([`app.py:24`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L24)): `{".mp4", ".avi", ".mov", ".mkv", ".webm"}`.
  - Frontend ([`web/lib/api.ts:12`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/lib/api.ts#L12)): `[".mp4", ".mov", ".avi", ".mkv", ".webm"]`.

---

## 4. Env Vars & Secrets

### Referenced Environment Variables
- `NEXT_PUBLIC_API_BASE`:
  - Referenced in [`web/lib/api.ts:8`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/lib/api.ts#L8): `const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";`.
  - Defined in [`web/.env.local.example:9`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/.env.local.example#L9): `NEXT_PUBLIC_API_BASE=http://localhost:5000`.
  - Defined in [`web/.env.local:5`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/.env.local#L5): `NEXT_PUBLIC_API_BASE=http://localhost:5000`.
  - Purpose: Directs Next.js dev server (`:3000`) requests to Flask (`:5000`). Unset in production build because static export is served same-origin by Flask.
- **Other Env Vars:** None. No other `process.env`, `os.environ`, or `os.getenv` references exist in the entire repository.

### Databases
- **Database in Use:** **None**. No database (SQL, NoSQL, ORM, SQLite, Redis, or in-memory database) is configured or referenced in the repository.

### Third-Party API Keys
- **API Keys Required:** **None**. No external third-party API keys (OpenAI, AWS, GCP, Azure, etc.) are defined, referenced, or required.

---

## 5. File & Upload Handling

### Storage Location
- **Upload Path:** Saved locally to disk in the `./uploads/` directory relative to current working directory ([`app.py:17, 53`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L17-L53)):
  - Generated filename: `uploads/{uuid.uuid4().hex}{ext}`.
  - Saved via: `f.save(path)` ([`app.py:54`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L54)).
  - Cleaned up via: `os.remove(path)` inside `finally:` block ([`app.py:58`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L58)).
- **Cloud Storage:** None (no S3, Azure Blob, or Google Cloud Storage).

### Max Upload Size
- Enforced at 200 MB in three locations:
  1. [`app.py:16`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L16): `app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024`.
  2. [`web/lib/api.ts:10, 21-23`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/lib/api.ts#L10-L23): `MAX_UPLOAD_BYTES = 200 * 1024 * 1024`.
  3. [`templates/index.html:939`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/templates/index.html#L939): `MAX_SIZE = 200 * 1024 * 1024`.

### Local Filesystem Persistence Assumptions
- **Uploaded Videos:** Ephemeral. Deleted immediately after `det.predict(path)` finishes ([`app.py:58`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L58)).
- **Persistent Filesystem Requirement:**
  1. The code **assumes write access to local disk** (`./uploads/`) during request processing because OpenCV `cv2.VideoCapture(path)` requires a filesystem file path rather than an in-memory stream ([`detector.py:428, 448`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L428-L448)).
  2. The code **assumes read access to local disk** for model files (`ep14.pt`, `det_10g.onnx`, `w600k_r50.onnx`), which are loaded via local path parameters in `Detector.__init__` ([`detector.py:77-78`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/detector.py#L77-L78)).
  3. The code **assumes read access to local disk** for `web/out/` when serving frontend assets via `send_from_directory` ([`app.py:39, 81, 85, 87`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L39-L87)).

---

## 6. Existing Infrastructure Artifacts

### Deployment Configurations
- `Dockerfile`: **Absent**.
- `docker-compose.yml` / `compose.yaml`: **Absent**.
- `vercel.json`: **Absent** (neither in root nor in `web/`).
- GitHub Actions workflows (`.github/`): **Absent**.
- Platform descriptors (`Procfile`, `render.yaml`, `fly.toml`, `railway.json`, `nixpacks.toml`): **Absent**.

### Current Runtime Execution Environment
- **Operational Model:** Single-process local bare-metal / virtual environment deployment:
  1. Build step: `npm run build` in `web/` to produce static output at `web/out/`.
  2. Run step: `python app.py` at root.
  3. Server: Flask built-in development server running on `host="0.0.0.0"`, `port=5000` (`debug=False`) ([`app.py:91`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L91)).
  4. Production WSGI server (Gunicorn, Uvicorn, Waitress): **None configured**.
- **Development Workflow:**
  - Dual-server setup: Flask runs on port 5000 (`python app.py`), Next.js dev server runs on port 3000 (`npm run dev` in `web/`).
  - CORS for dev server is enabled in [`app.py:13, 27-33`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/app.py#L13-L33) for `http://localhost:3000` and `http://127.0.0.1:3000`.

---

## 7. Git & Version Control

### Repository Details
- **Git Host:** GitHub (`origin` remote URL: `https://github.com/naeemkhan988/DeepFake-Video-Detection.git`).
- **Default Branch:** `main` (`remotes/origin/HEAD -> origin/main`).
- **Branch Structure:** Single branch (`main`). No other local or remote branches exist.
- **Working Tree State:**
  - Branch `main` is ahead of `origin/main` by 1 commit (`7a4c9e3 added light mode`).
  - Uncommitted modified files present in working directory:
    - [`web/app/about/page.tsx`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/app/about/page.tsx)
    - [`web/components/face-cloud.tsx`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/components/face-cloud.tsx)
    - [`web/components/hero.tsx`](file:///c:/Users/iamja/Desktop/FYP/DeepFake-Video-Detection/web/components/hero.tsx)
