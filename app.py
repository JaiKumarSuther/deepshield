import os, uuid
from flask import Flask, request, render_template, jsonify, send_from_directory
from detector import Detector

# The Next.js frontend builds to web/out. When that directory exists it is
# served as the UI; otherwise the app falls back to the original Jinja
# template, so a fresh clone still runs without Node installed.
WEB_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "out")
HAS_BUILD = os.path.isdir(WEB_OUT)

# Origins allowed to call /analyse cross-origin. Only the Next dev server:
# in production the export is same-origin and needs no CORS at all.
DEV_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024   # 200 MB
UPLOAD = "uploads"
os.makedirs(UPLOAD, exist_ok=True)

print("loading model...")
det = Detector()
print("frontend:", "next build (web/out)" if HAS_BUILD else "flask template")

ALLOWED = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


@app.after_request
def allow_dev_origin(resp):
    origin = request.headers.get("Origin")
    if origin in DEV_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
    return resp


@app.route("/")
def index():
    if HAS_BUILD:
        return send_from_directory(WEB_OUT, "index.html")
    return render_template("index.html")


@app.route("/analyse", methods=["POST"])
def analyse():
    f = request.files.get("video")
    if not f or not f.filename:
        return jsonify({"error": "No file uploaded."}), 400

    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED:
        return jsonify({"error": f"Unsupported format {ext}."}), 400

    path = os.path.join(UPLOAD, f"{uuid.uuid4().hex}{ext}")
    f.save(path)
    try:
        result = det.predict(path)
    finally:
        os.remove(path)

    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "That video is larger than the 200 MB limit."}), 413


if HAS_BUILD:
    @app.route("/<path:page>")
    def static_export(page):
        """Serve the Next.js export.

        Routes are exported with trailing slashes, so /about arrives here
        as "about" and the file lives at about/index.html. Assets under
        /_next/ arrive with their real filename and hit the first branch.
        """
        candidate = os.path.join(WEB_OUT, page)
        if os.path.isfile(candidate):
            return send_from_directory(WEB_OUT, page)

        nested = os.path.join(page, "index.html")
        if os.path.isfile(os.path.join(WEB_OUT, nested)):
            return send_from_directory(WEB_OUT, nested)

        return send_from_directory(WEB_OUT, "404.html"), 404


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
