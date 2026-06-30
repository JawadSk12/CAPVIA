I<div align="center">

# 🎓 IntelliRecruit AI

### AI-Powered Interview Platform with Real-Time Cheating Detection

**React · TypeScript · Python · MediaPipe · OpenCV · ArcFace · YOLOv8**

---

![Status](https://img.shields.io/badge/status-active-brightgreen)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-FF6F00?logo=google)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## 📌 What is This?

**IntelliRecruit AI** is a full-stack online interview proctoring platform. Candidates answer AI-voice-driven questions through their webcam while the system silently monitors for academic dishonesty using two parallel detection engines:

| Engine | Technology | Status |
|--------|-----------|--------|
| 🌐 **Browser-Native** | MediaPipe FaceMesh (WASM via CDN) | ✅ Active |
| 🐍 **Python ML API** | FastAPI + OpenCV + ArcFace + YOLOv8 | ✅ Available |

The browser engine requires **zero backend** — detection runs fully in-browser using WebAssembly. The Python API provides deeper analysis (face identity verification, object detection) when running locally.

---

## ✨ Features

- 🎥 **Live Video Recording** — WebRTC `MediaRecorder`, exported as `.webm`
- 👁️ **Eye Gaze Tracking** — Iris position within eye socket → LEFT / CENTER / RIGHT
- 🗣️ **Head Pose Estimation** — Yaw / Pitch / Roll via solvePnP or geometric ratio
- 👤 **Face Count Detection** — No face, one face, or multiple people
- 🆔 **Identity Verification** — ArcFace 512-d embeddings, cosine similarity (Python path)
- 📱 **Phone Detection** — YOLOv8 COCO class 67 (Python path, re-enableable)
- 🔒 **Browser Security** — Tab-switch, copy/paste, right-click, hotkey blocking
- 🎙️ **AI Interviewer Voice** — Web Speech Synthesis TTS
- 📊 **Integrity Score (0–100)** — Tiered penalty formula, final report
- 📄 **Downloadable Report** — JSON + video download on Results page

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                          │
│                                                                 │
│  Welcome → DeviceValidation → Interview ──────────→ Results    │
│                                   │                             │
│                          ┌────────┴────────┐                   │
│                          │ useBrowserFace  │                   │
│                          │  Detection.ts   │                   │
│                          │                 │                   │
│                          │  MediaPipe      │                   │
│                          │  FaceMesh (CDN) │                   │
│                          │  • Gaze         │                   │
│                          │  • Head Pose    │                   │
│                          │  • Face Count   │                   │
│                          └────────┬────────┘                   │
│                                   │                             │
└───────────────────────────────────┼─────────────────────────────┘
                                    │  (optional, HTTP)
                    ┌───────────────▼───────────────┐
                    │   Python FastAPI Server        │
                    │   localhost:5001               │
                    │                                │
                    │  POST /set_reference  ──► ArcFace embedding
                    │  POST /analyze        ──► Full ML pipeline
                    │                                │
                    │  ┌──────────────────────────┐  │
                    │  │  CheatingDetectionEngine │  │
                    │  │  • FaceDetector (MP)     │  │
                    │  │  • IdentityVerifier      │  │
                    │  │  • PoseEstimator (PnP)   │  │
                    │  │  • GazeTracker (iris)    │  │
                    │  │  • PhoneDetector (YOLO)  │  │
                    │  │  • BehaviorAnalyzer      │  │
                    │  └──────────────────────────┘  │
                    └────────────────────────────────┘
```

---

## 📁 Project Structure

```
ai_interview/
│
├── src/                              React + TypeScript frontend
│   ├── pages/
│   │   ├── Welcome.tsx               Landing page
│   │   ├── DeviceValidation.tsx      Camera/mic/lighting checks
│   │   ├── Interview.tsx             ★ Main interview page (wires everything)
│   │   └── Results.tsx               Final integrity report + video
│   │
│   ├── hooks/
│   │   ├── useBrowserFaceDetection.ts  ★ Core ML hook (MediaPipe WASM)
│   │   ├── useCheatingDetection.ts     API-based hook (calls Python server)
│   │   ├── useInterviewFlow.ts         Question state machine + TTS
│   │   ├── useAudioAnalysis.ts         Microphone volume meter
│   │   └── useVideoRecorder.ts         MediaRecorder wrapper
│   │
│   ├── services/
│   │   ├── videoRecordingService.ts    Records + exports .webm video
│   │   ├── cheatingDetectionService.ts HTTP client for Python API
│   │   ├── ttsService.ts               AI voice (Web Speech Synthesis)
│   │   └── speechAnalysisService.ts    WPM, pause rate, filler words
│   │
│   ├── components/
│   │   └── Interview/
│   │       ├── VideoRecorder.tsx       Camera feed display
│   │       ├── QuestionDisplay.tsx     Interview question card
│   │       ├── InterviewControls.tsx   Start/Pause/End buttons
│   │       └── InterviewHeader.tsx     Top bar with status
│   │
│   ├── types/                          TypeScript interfaces
│   └── data/questions.ts              Interview question bank
│
├── ml_pipeline/                       Python machine vision modules
│   └── modules/
│       ├── detection_engine.py        ★ Main orchestrator
│       ├── face_detection.py          MediaPipe + ArcFace
│       ├── pose_estimation.py         FaceMesh + solvePnP
│       ├── gaze_tracking.py           Iris ratio gaze
│       ├── behavior_analysis.py       Rolling window stats
│       └── phone_detection.py         YOLOv8 (placeholder)
│
├── inference/
│   ├── api.py                         FastAPI REST server
│   └── yolov8n.pt                     YOLOv8 Nano weights (6.5 MB)
│
└── PROJECT_EXPLAINER.txt             Deep-dive documentation
```

---

## 🧠 Machine Vision — How It Works

### Browser Path (Active, No Server Required)

Every **700ms**, a video frame is sent to MediaPipe FaceMesh (running as WASM in the browser). The 478 facial landmarks returned are used to compute:

#### 1. Head Yaw (Left/Right Rotation)
```
lw = nose.x − left_cheek.x       ← left half-width of face
rw = right_cheek.x − nose.x      ← right half-width of face
yaw = ((rw − lw) / (lw + rw)) × 90°
```
Turned right → rw grows → yaw positive. Turned left → lw grows → yaw negative.

#### 2. Head Pitch (Up/Down Tilt)
```
ratio = (nose.y − forehead.y) / (chin.y − forehead.y)
pitch = −(ratio − neutral) × 90°
```
`neutral` is **auto-calibrated** from the first **15 frames** per person (median), eliminating false pitch readings from different face shapes.

#### 3. EMA Smoothing (Removes Jitter)
```
smoothed = 0.35 × raw + 0.65 × previous_smoothed
```
Applied to yaw, pitch, and roll independently. Prevents landmark noise from triggering false head-turn counts.

#### 4. Iris Gaze Ratio
```
ratio = (iris.x − eye_left_corner.x) / eye_width
→ < 0.40 = LEFT  |  0.40–0.60 = CENTER  |  > 0.60 = RIGHT
```
Only used when head is forward (`|yaw| < 15°, |pitch| < 12°`). When head turns, gaze is inferred from head direction. A **3-frame majority vote** prevents flicker.

#### 5. Integrity Score (Tiered Penalty)

| Violation | Grace | Penalty |
|-----------|-------|---------|
| Look-away (gaze off-center) | First 2 free | +1pt each, then +3pt each |
| Head turn (|yaw| > 18°) | First 3 free | +4pt each after |
| Face disappears | None | +6pt each event |
| Multiple faces | None | +10pt each event |

`Integrity Score = max(0, 100 − total_penalty)`

---

### Python ML Path (Deeper Analysis)

When the FastAPI server is running, the full pipeline activates:

```python
# Per-frame pipeline (detection_engine.py)
face_count, identity  = identity_verifier.verify(frame)      # ArcFace
landmarks, pose       = pose_estimator.estimate(frame)        # solvePnP
gaze                  = gaze_tracker.track(landmarks)         # Iris ratio
phone_visible         = phone_detector.detect(frame)          # YOLOv8
behavior.update(...)                                          # rolling window
score                 = calculate_score()                     # weighted sum
```

**ArcFace identity verification:**
```python
# On session start: store 512-d embedding of the candidate's face
reference = arcface_model.get(first_frame)[0].embedding

# Each frame: compare current face to reference
similarity = dot(face.embedding, reference) / (norm(face) × norm(reference))
is_same_person = similarity >= 0.6   # cosine similarity threshold
```

**Head pose via solvePnP:**
```python
# 6 known 3D face points (generic model in mm)
# 6 corresponding 2D landmark positions from FaceMesh
success, rvec, tvec = cv2.solvePnP(model_3d, image_2d, camera_matrix, dist)
R, _ = cv2.Rodrigues(rvec)
yaw   = degrees(arctan2(R[1,0], R[0,0]))
pitch = degrees(arcsin(-R[2,0]))
roll  = degrees(arctan2(R[2,1], R[2,2]))
```

---

## 🚀 Quick Start

### Frontend Only (Browser Detection — Recommended)

```bash
git clone https://github.com/your-username/intell-Interview
cd intell-Interview
npm install
npm start
# Opens at http://localhost:3000
```

No Python server required. MediaPipe loads from CDN automatically.

---

### With Python ML Server

#### Prerequisites
- Python 3.11 (recommended — best MediaPipe wheel support)
- Node.js 18+

```bash
# 1. Set up Python environment
cd intell-Interview
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel

# 2. Install Python dependencies
pip install fastapi uvicorn "python-multipart"
pip install opencv-python mediapipe
pip install insightface onnxruntime       # ArcFace face recognition
pip install ultralytics                   # YOLOv8 (optional, phone detection)

# 3. Start FastAPI server
python inference/api.py
# Server starts at http://localhost:5001
# Docs at  http://localhost:5001/docs

# 4. In a separate terminal, start the frontend
npm install && npm start
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check — returns `{ engine_ready, reference_set }` |
| `POST` | `/set_reference` | Upload first-frame JPEG to register candidate's face |
| `POST` | `/analyze` | Upload JPEG frame → returns full detection result |
| `POST` | `/reset` | Clear session state for a new candidate |
| `GET` | `/status` | Current weights and engine state |

**Example `/analyze` response:**
```json
{
  "face_count": 1,
  "gaze_direction": "CENTER",
  "head_pose": { "yaw": 2.1, "pitch": -1.4, "roll": 0.8 },
  "phone_visible": false,
  "integrity_score": 97.5,
  "is_cheating": false,
  "violations": []
}
```

---

## 📊 Scoring System

### Weighted Cheating Score (Python Path)

| Signal | Weight | Notes |
|--------|--------|-------|
| Phone detected | 45% | Highest priority |
| Multiple faces | 25% | Someone coaching |
| Gaze deviation | 20% | Reading notes |
| Head pose | 10% | Turned away |

`integrity_score = (1 − weighted_score) × 100`

### Risk Levels

| Score | Risk | HR Recommendation |
|-------|------|-------------------|
| 80–100 | 🟢 LOW | Candidate performed well |
| 60–79 | 🟡 MEDIUM | Some concerns, review recommended |
| 40–59 | 🟠 HIGH | Multiple violations detected |
| 0–39 | 🔴 CRITICAL | Manual review required |

---

## 🛠️ Troubleshooting

<details>
<summary><strong>MediaPipe import error on macOS</strong></summary>

```bash
# Symptom: AttributeError: module 'mediapipe' has no attribute 'solutions'
# Fix: use an older MediaPipe version or Python 3.11

pip uninstall -y mediapipe && pip cache purge
pip install mediapipe==0.10.14

# If still failing, switch Python version
pyenv install 3.11.9
pyenv local 3.11.9
python -m venv .venv311 && source .venv311/bin/activate
pip install mediapipe
```
</details>

<details>
<summary><strong>Camera access denied in browser</strong></summary>

- Open `chrome://settings/content/camera` and allow `localhost`
- Ensure no other app is using the camera
- Refresh the page and click "Allow" on the browser prompt
</details>

<details>
<summary><strong>MediaPipe CDN fails to load (offline / firewall)</strong></summary>

The browser hook loads from `cdn.jsdelivr.net` with an `unpkg.com` fallback.
If both fail (corporate firewall), self-host the MediaPipe bundle:

```bash
npm install @mediapipe/face_mesh
# Then update the locateFile path in useBrowserFaceDetection.ts
```
</details>

<details>
<summary><strong>InsightFace / ArcFace installation on macOS M1/M2</strong></summary>

```bash
# Requires cmake and Xcode tools
xcode-select --install
brew install cmake

pip install insightface
# Downloads buffalo_l model (~300MB) on first use
```
</details>

<details>
<summary><strong>Port 5001 already in use</strong></summary>

```bash
lsof -ti:5001 | xargs kill -9
python inference/api.py
```
</details>

---

## 🐳 Docker (Python Server)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
RUN apt-get update && apt-get install -y \
    build-essential cmake libgl1-mesa-glx libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY inference/ ./inference/
COPY ml_pipeline/ ./ml_pipeline/

RUN pip install --no-cache-dir \
    fastapi uvicorn python-multipart \
    opencv-python mediapipe \
    insightface onnxruntime

EXPOSE 5001
CMD ["python", "inference/api.py"]
```

```bash
docker build -t intellirecruit-api .
docker run --rm -p 5001:5001 intellirecruit-api
```

---

## 🔬 ML / CV Concepts Used

| Concept | Where | Library |
|---------|-------|---------|
| Face Mesh (478 landmarks) | Browser + Python | MediaPipe |
| Iris Localisation (landmarks 468–477) | Gaze tracking | MediaPipe |
| Perspective-n-Point (solvePnP) | Head pose (Python) | OpenCV |
| Rodrigues Rotation Decomposition | Euler angles from R matrix | OpenCV |
| ArcFace Embeddings (512-dim) | Identity verification | InsightFace |
| Cosine Similarity | Face comparison | NumPy |
| YOLOv8 Object Detection | Phone detection | Ultralytics |
| EMA Temporal Smoothing | Jitter removal in browser | Pure JS |
| Rolling Window Statistics | Behaviour analysis | deque / NumPy |
| Geometric Ratio (nose/cheek) | Browser yaw estimation | Pure Math |
| Per-Session Pitch Calibration | Normalise to candidate's pose | Running Median |
| Edge Detection on Counters | Count distinct events only | Ref Flags |

---

## 📸 Detection Dashboard

The live interview screen shows a real-time sidebar with:

- **Integrity Score** — Live 0–100 gauge (green → red)
- **Eye Gaze** — Direction indicator + look-away counter
- **Head Pose** — Yaw / Pitch / Roll bars + turn counter
- **Face Detection** — Face count + disappearance events
- **Browser Events** — Tab switches, copy attempts, suspicious hotkeys
- **Violation Log** — Timestamped event list

---

## 📋 Requirements

### Frontend
```
Node.js 18+
React 18
TypeScript 5
react-router-dom 6
```

### Python Backend
```
Python 3.11+
fastapi
uvicorn
opencv-python
mediapipe >= 0.10
insightface
onnxruntime
ultralytics (optional)
numpy
```
---
## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

---


<div align="center">

**Built with ❤️ using React, MediaPipe, OpenCV, and FastAPI**

*For detailed file-by-file documentation, see [`PROJECT_EXPLAINER.txt`](./PROJECT_EXPLAINER.txt)*

</div>
