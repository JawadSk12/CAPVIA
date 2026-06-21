"""Isolated code execution service."""
import subprocess
import tempfile
import os
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
TIMEOUT = 10
ALLOWED_LANGUAGES = {"python": ("python3", ".py"), "javascript": ("node", ".js")}

@app.route("/execute", methods=["POST"])
def execute():
    data = request.json
    code = data.get("code", "")
    language = data.get("language", "python")
    if language not in ALLOWED_LANGUAGES:
        return jsonify({"error": f"Language {language} not supported"}), 400
    interpreter, ext = ALLOWED_LANGUAGES[language]
    with tempfile.NamedTemporaryFile(suffix=ext, mode="w", delete=False) as f:
        f.write(code)
        tmp = f.name
    try:
        start = time.time()
        result = subprocess.run([interpreter, tmp], capture_output=True, text=True, timeout=TIMEOUT)
        elapsed = time.time() - start
        return jsonify({"output": result.stdout, "error": result.stderr or None, "execution_time": round(elapsed, 3), "exit_code": result.returncode})
    except subprocess.TimeoutExpired:
        return jsonify({"output": "", "error": "Execution timed out", "execution_time": TIMEOUT, "exit_code": -1})
    finally:
        os.unlink(tmp)

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
