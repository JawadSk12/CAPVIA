# CAPVIA AI Interview Engine — Integration API Specification

This document provides a comprehensive technical overview, architecture design, and API specification for integrating the **IntelliRecruit AI Interview & Proctoring Engine** into the **CAPVIA Platform**.

---

## 1. Overview & Architectural Design

The AI Interview Engine is a multi-modal, local-first system that automates technical screening, proctoring (cheating detection), and comprehensive capability evaluations. 

### Architecture Diagram

The diagram below illustrates the components of the AI Interview Engine, showing the local browser-native engine, the legacy Python ML servers, and the proposed CAPVIA Integration Layer.

```mermaid
graph TD
    subgraph CAPVIA Platform (Cloud)
        C_API[CAPVIA API Gateway]
        C_DB[(CAPVIA central Database)]
        C_S3[(CAPVIA Video & JSON Store)]
    end

    subgraph local_kiosk_environment [Local Candidate Machine]
        direction TB
        subgraph Electron Wrapper
            EL_LOCK[lockdown Enforcer]
            KB_BLOCK[keyboard Blocker]
            FE_FOCUS[focus Enforcer]
        end

        subgraph React Frontend
            UI[Interview Page UI]
            MP_FM[MediaPipe FaceMesh WASM]
            TF_COCO[TensorFlow.js COCO-SSD]
            WEB_TTS[SpeechSynthesis TTS]
            WEB_STT[SpeechRecognition STT]
            STATE[sessionStorage / localStorage]
        end
    end

    subgraph Local AI Engines (Localhost Daemon)
        OLLAMA[Ollama Local LLM: mistral / llama3]
        EVAL_SRV[Python Evaluation Server: port 8765]
        PROC_SRV[Python Proctoring Server: port 5001]
    end

    %% Flow connections
    C_API <-->|Integrate via Gateway| UI
    UI -->|Blocks shortcuts, displays focus overlays| EL_LOCK
    UI -->|Pumps video frames| MP_FM
    UI -->|Pumps frames every 6th frame| TF_COCO
    UI -->|Asks questions| WEB_TTS
    UI -->|Transcribes answers| WEB_STT
    
    UI -->|Fetches tags / generates prompt| OLLAMA
    UI -->|POST /evaluate| EVAL_SRV
    UI -->|POST /analyze_cheating| PROC_SRV
    
    %% Storage Flow
    STATE -.->|Download JSON / WebM| UI
    UI -->|Stream Video & JSON Reports| C_API
    C_API -->|Store records| C_DB
    C_API -->|Upload video blobs| C_S3
```

---

## 2. Complete Interview Workflow Trace

The interview session transitions through several states, generating specific data objects at each phase.

```
Candidate Logs In
  ↓
Hardware Pre-Checks (Camera, Mic, Speaker)
  ↓
Face Reference Registration (Register face embedding)
  ↓
Question Generation (LLM creates 5-tier question progression)
  ↓
Speech Analysis (STT capture, WPM, filler word, pace calculation)
  ↓
Video Analysis & Proctoring (Gaze ratio, head yaw/pitch/roll, phone detection)
  ↓
Multi-Dimensional Evaluation (7 dimensions client-side, NLP keywords server-side)
  ↓
Final Score & Recommendation Generation
  ↓
State Persistence (JSON Report + WebM Video Download / Local Storage)
```

### Data Objects Produced

| Workflow Step | Data Object | Description / Fields |
| :--- | :--- | :--- |
| **Start / Registration** | `AuthSession` | Candidate login info: `name`, `email`, `role`, `timestamp`. |
| **Validation** | `DeviceValidationData` | Hardware permissions state: `cameraAuthorized`, `micAuthorized`, `speakerAuthorized`. |
| **Question Generation** | `InterviewQuestion[]` | 5 generated questions: `id`, `text`, `duration`, `difficulty` (`easy`, `medium`, `hard`), `category` (`technical`, `situational`). |
| **Answer Capture** | `AnswerRecord` | Saved per question: `questionId`, `questionText`, `difficulty`, `transcript`, `timestamp`. |
| **Speech Metrics** | `SpeechMetrics` | Extracted per answer: `averagePace` (WPM), `pauseFrequency`, `fillerWordRate`, `speechClarity` (%), `energyLevel`, `consistency`. |
| **Proctoring Frame** | `BrowserDetectionResult` | Computed every 250ms: `faceCount`, `gazeDirection`, `gazeRatio`, `headYaw`, `headPitch`, `headRoll`, `isLookingAway`, `isHeadTurned`, `isMultipleFaces`, `phoneVisible`. |
| **Proctoring Session** | `DetectionSnapshot` | Aggregated at complete: `eyeGaze` stats, `headPose` stats, `faceValidity` stats, `maskDetection` status, `phoneDetection` events, and `overall` integrity report (Integrity Score, Risk Level, Cheating Probability, Violations list). |
| **Local Security** | `LocalViolationSummary` | Recipient of Electron blur events: `tabSwitches`, `windowBlurs`, `rightClicks`, `copyPastes`, `suspiciousKeys`. |
| **AI Evaluation** | `EvaluationReport` | Calculated keywords & depth metrics: `totalScore`, `maxScore`, `percentage`, `recommendation`, `strengths[]`, `improvements[]`, `questionResults[]`. |
| **Deep AI Analysis** | `DeepEvalResult[]` | Client-side 7-dimension NLP evaluation containing: `overallScore`, `overallGrade`, `dimensions[]` (score, label, detail for 7 dimensions), `technicalUnderstanding`, `logicalThinking`, `communicationClarity`, `confidenceDelivery`, `detectedConcepts`, `missingConcepts`. |
| **Final Result Packet** | `CompletedSession` | Unified session packet: `id`, `candidateName`, `internshipRole`, `company`, `timestamp`, `videoBase64` (base64 WebM), `evalReport`, `detectionData`, `deepEvalResults`, `localViolations`. |

---

## 3. Existing APIs Reference

### 3.1. Proctoring & Feature API (FastAPI, Port 5001)

* **Source File**: [inference/api.py](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/inference/api.py)

#### 3.1.1. Health Check
* **URL**: `GET /`
* **HTTP Method**: `GET`
* **Authentication**: None
* **Request**: None
* **Response Schema**:
  ```json
  {
    "status": "string",
    "engine_ready": "boolean",
    "reference_set": "boolean",
    "api_version": "string"
  }
  ```
* **Example Request**:
  ```http
  GET / HTTP/1.1
  Host: localhost:5001
  ```
* **Example Response**:
  ```json
  {
    "status": "ok",
    "engine_ready": true,
    "reference_set": false,
    "api_version": "2.0.0"
  }
  ```

#### 3.1.2. Register Reference Face
* **URL**: `POST /set_reference`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Multipart Form-Data)**:
  * `file`: Image file (JPEG/PNG) of candidate looking directly at screen.
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "message": "string"
  }
  ```
* **Example Request**:
  ```http
  POST /set_reference HTTP/1.1
  Host: localhost:5001
  Content-Type: multipart/form-data; boundary=boundary123

  --boundary123
  Content-Disposition: form-data; name="file"; filename="frame0.jpg"
  Content-Type: image/jpeg

  [binary image bytes]
  --boundary123--
  ```
* **Example Response**:
  ```json
  {
    "success": true,
    "message": "Reference face set."
  }
  ```

#### 3.1.3. Rule-Based Cheating Detection (Legacy)
* **URL**: `POST /analyze`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Multipart Form-Data)**:
  * `file`: Video frame image (JPEG/PNG).
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "face_count": "integer",
    "gaze_direction": "string | null",
    "phone_visible": "boolean",
    "head_pose": {
      "yaw": "float",
      "pitch": "float",
      "roll": "float"
    },
    "cheating_score": "float",
    "violations": [
      {
        "type": "string",
        "severity": "string",
        "message": "string",
        "weight": "float"
      }
    ],
    "is_cheating": "boolean",
    "integrity_score": "float"
  }
  ```
* **Example Response**:
  ```json
  {
    "success": true,
    "face_count": 1,
    "gaze_direction": "CENTER",
    "phone_visible": false,
    "head_pose": { "yaw": -2.3, "pitch": 1.1, "roll": 0.5 },
    "cheating_score": 0.0,
    "violations": [],
    "is_cheating": false,
    "integrity_score": 100.0
  }
  ```

#### 3.1.4. Reset Proctoring Engine
* **URL**: `POST /reset`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "message": "string"
  }
  ```
* **Example Response**:
  ```json
  {
    "success": true,
    "message": "All engines reset."
  }
  ```

#### 3.1.5. Model Status Check
* **URL**: `GET /status`
* **HTTP Method**: `GET`
* **Authentication**: None
* **Response Schema**:
  ```json
  {
    "reference_set": "boolean",
    "weights": "object",
    "ready": "boolean",
    "api_version": "string",
    "models": {
      "confidence": "boolean",
      "cheating_lstm": "boolean",
      "phone_v2": "boolean",
      "skill": "boolean"
    }
  }
  ```

#### 3.1.6. Analyze Confidence (Nervousness)
* **URL**: `POST /analyze_confidence`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Multipart Form-Data)**:
  * `file`: Video frame image (JPEG/PNG).
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "confidence_score": "float",
    "face_class": "string",
    "message": "string"
  }
  ```

#### 3.1.7. Cheating Risk Analysis (Rule-Based + BiLSTM Hybrid)
* **URL**: `POST /analyze_cheating`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Multipart Form-Data)**:
  * `file`: Video frame image (JPEG/PNG).
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "cheating_risk": "float",
    "rule_based_score": "float",
    "lstm_risk": "float",
    "violations": "array",
    "is_cheating": "boolean",
    "integrity_score": "float"
  }
  ```

#### 3.1.8. YOLOv8 Phone Detection
* **URL**: `POST /detect_phone`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Multipart Form-Data)**:
  * `file`: Video frame image (JPEG/PNG).
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "phone_detected": "boolean",
    "detections": "array",
    "phone_duration_sec": "float",
    "message": "string"
  }
  ```

#### 3.1.9. Semantic Answer Evaluation (Single Q&A)
* **URL**: `POST /evaluate_skill`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Form-Data)**:
  * `question` (string, required): The interview question asked.
  * `candidate_answer` (string, required): Spoken/transcribed answer.
  * `reference_answer` (string, optional): Ideal expected answer.
  * `domain` (string, optional): E.g., `python`, `sql`, `algorithms`, `behavioral`.
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "skill_score": "float",
    "relevance": "float",
    "keywords_matched": ["string"],
    "feedback": "string",
    "domain": "string"
  }
  ```

#### 3.1.10. Full Unified Analysis (Frame + Text Answer)
* **URL**: `POST /full_analyze`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (Form-Data/Multipart)**:
  * `frame` (UploadFile, optional): Video frame.
  * `question` (string): Question.
  * `candidate_answer` (string): Answer transcript.
  * `reference_answer` (string): Expected answer.
  * `domain` (string): Domain.
* **Response Schema**:
  ```json
  {
    "success": "boolean",
    "confidence_score": "float",
    "cheating_risk": "float",
    "phone_detected": "boolean",
    "skill_score": "float",
    "final_score": "float",
    "violations": "array",
    "integrity_score": "float",
    "timestamp": "string",
    "details": "object"
  }
  ```

---

### 3.2. Evaluation Server (FastAPI, Port 8765)

* **Source File**: [evaluation_server.py](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/evaluation_server.py)

#### 3.2.1. Health Check
* **URL**: `GET /health`
* **HTTP Method**: `GET`
* **Authentication**: None
* **Response**: `{"status": "ok", "service": "AI Interview Evaluator", "version": "1.0.0"}`

#### 3.2.2. Evaluate Batch Answers (Up to 10 Q&A pairs)
* **URL**: `POST /evaluate`
* **HTTP Method**: `POST`
* **Authentication**: None
* **Request Schema (JSON)**:
  ```json
  {
    "role": "string",
    "topic": "string",
    "qa_pairs": [
      {
        "question": "string",
        "answer": "string"
      }
    ]
  }
  ```
* **Response Schema (JSON)**:
  ```json
  {
    "final_score_pct": "string",
    "final_score_raw": "float",
    "tier": "string",
    "color": "string",
    "strengths": "string",
    "weaknesses": "string",
    "suggestions": "string",
    "per_question": [
      {
        "question": "string",
        "user_answer": "string",
        "keyword_score": "float",
        "semantic_score": "float",
        "concept_score": "float",
        "final_score": "float",
        "score_pct": "string",
        "tier": "string",
        "color": "string",
        "correct": "string",
        "missing": "string",
        "suggestion": "string",
        "covered": ["string"],
        "missing_concepts": ["string"]
      }
    ]
  }
  ```
* **Example Request**:
  ```json
  {
    "role": "React Developer",
    "topic": "React Hooks",
    "qa_pairs": [
      {
        "question": "What is useEffect hook?",
        "answer": "useEffect lets you perform side effects in functional components like fetching data or setting up subscriptions."
      }
    ]
  }
  ```
* **Example Response**:
  ```json
  {
    "final_score_pct": "78.0%",
    "final_score_raw": 0.78,
    "tier": "Good",
    "color": "#10B981",
    "strengths": "Good understanding of functional components and side effects.",
    "weaknesses": "Missed cleanup dependency array details.",
    "suggestions": "Mention cleanup function return structures next time.",
    "per_question": [
      {
        "question": "What is useEffect hook?",
        "user_answer": "useEffect lets you perform side effects in functional components like fetching data or setting up subscriptions.",
        "keyword_score": 0.80,
        "semantic_score": 0.85,
        "concept_score": 0.70,
        "final_score": 0.78,
        "score_pct": "78.0%",
        "tier": "Good",
        "color": "#10B981",
        "correct": "Correctly identified functional components and side effects.",
        "missing": "Missing cleanup returns and dependencies.",
        "suggestion": "Explain dependencies in detail.",
        "covered": [],
        "missing_concepts": []
      }
    ]
  }
  ```

---

## 4. Evaluation Metrics & Logic

The engine generates multiple metrics during the assessment. Their calculation logic is as follows:

| Metric Name | Description | Source File | Calculation Logic | Output Format |
| :--- | :--- | :--- | :--- | :--- |
| **Communication Score** | Rates language fluency, structural cohesion, and word usage. | [deepEvaluationService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/deepEvaluationService.ts) | Starts at 50 points. Adds points for vocabulary richness (Type-Token Ratio * 50) and sentence completeness (up to 20). Deducts points for high filler-word ratios (`fillerCount/totalWords * 100 * 0.6`). Caps at 100. | `integer` (0-100) |
| **Confidence Score** | Measures assertiveness and lack of hesitation in speech. | [deepEvaluationService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/deepEvaluationService.ts) | Analyzes text patterns. Starts at 50 points. Adds 10 points for strong words (`I know`, `believe`, `implemented`, `built`). Subtracts 12 points for hedging words (`I think`, `maybe`, `perhaps`, `I don't know`). Range 0 to 100. | `integer` (0-100) |
| **Clarity Score** | Combines pacing, vocabulary, and structural markers. | [deepEvaluationService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/deepEvaluationService.ts) | Measures the average length of meaningful word segments per sentence. Optimal is between 4 and 20. Adds points for structural indicators (e.g. `first`, `second`, `-`, bullet points). | `integer` (0-100) |
| **Integrity Score** | Measures compliance with exam protocols. | [useBrowserFaceDetection.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/hooks/useBrowserFaceDetection.ts) | Starts at 100%. Deducts penalties on edge-triggered events: `lookAwayPen` (first 3 free, then -4pt each), `headPen` (first 4 free, then -2pt each), `absPen` (first free, then -7pt each), `multiFacePen` (-10pt each), `phonePen` (first is -25pt, then -10pt), `downPen` (-13pt each). Minimum score is 0. | `integer` (0-100) |
| **Speech Metrics** | Details of speech structure: WPM, filler rates. | [speechAnalysisService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/speechAnalysisService.ts) | `averagePace` = `wordCount / duration * 60`; `fillerWordRate` = `fillerCount / duration * 60`; `speechClarity` = average STT token confidence; `energy` = pace-to-pause ratio. | JSON object with rates and consistency % |
| **Eye Tracking Metrics** | Tracks gaze deviation and screen focus. | [useBrowserFaceDetection.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/hooks/useBrowserFaceDetection.ts) | Horizontal iris ratio: `(iris.x - inner.x) / (outer.x - inner.x)`. Looks away if ratio < 0.38 (Left) or > 0.62 (Right). Vertical ratio checks for look down (>0.73) or look up (<0.32). | Focus % and look-away count |
| **Cheating Metrics** | Aggregate probability of active cheating. | [detection_engine.py](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/ml_pipeline/modules/detection_engine.py) | Weighted sum: `phone` duration (45%), `multi_face` time (25%), `gaze` deviation (20%), and `head_pose` instability (10%). Override to 1.0 if `looking_down` sustained for >3 seconds. | `float` (0.0 to 1.0) and `boolean` flag |
| **Behavior Metrics** | Physical metrics tracking head stability. | [useBrowserFaceDetection.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/hooks/useBrowserFaceDetection.ts) | `stability` = `100 - abs(headYaw) * 2`. `movementCount` count of Yaw deviations >16° or Pitch >13° or Roll >18°. | Stability % and movement count |
| **Skill Metrics** | Performance on domain knowledge. | [speechEvaluationService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/speechEvaluationService.ts) | Keyword points (50% based on matching meaning-words of question), Depth points (30% depending on length relative to difficulty), Coherence points (15% for reasoning connectors), and Vocabulary richness (5% for unique words). | `integer` (0-100) |
| **Question Scores** | Breakdowns per question. | [speechEvaluationService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/speechEvaluationService.ts) | Weighted average of keywords match and answer length. Mapping: Score >=70 is `Correct`, >=35 is `Partially Correct`, else `Incorrect`. | Verdict status and 0-100 score |
| **Final Evaluation** | Overall suitability recommendation. | [speechEvaluationService.ts](file:///Volumes/KINGSTON/CAPVIA_AI_interview_feature-main/src/services/speechEvaluationService.ts) | Sum of question scores / max score. Percentage mapping: >=78% is `Strong Hire`, >=60% is `Consider`, >=42% is `Review Required`, else `Not Recommended`. | Status recommendation string |

---

## 5. Storage, Database, & State Management

Currently, the application runs in a local-only sandboxed desktop context. Data persistence is structured as follows:

1. **State Management**: React state handles real-time proctoring data feeds, active transcriptions, audio streams, and timers.
2. **Session Storage (`sessionStorage`)**:
   - `intellirecruit_answers`: Temporary array of `AnswerRecord` values representing the current active session's transcriptions.
3. **Local Storage (`localStorage`)**:
   - `ir_completed_sessions`: Stores a JSON array of `CompletedSession` objects containing every candidate's full profile, scores, deep 7-dimension breakdowns, proctoring violations, and base64 video files.
   - `ir_current_session_id`: Tracks the most recently completed interview session ID.
4. **Local Files**:
   - The candidate can manually download a JSON evaluation report and a WebM video recording of the interview through the results screen.

---

## 6. CAPVIA Integration Layer

### Architectural Gaps (Missing APIs)

To migrate this local application to a SaaS integration with CAPVIA, the following backend endpoints must be established:
1. **Vacation / Vacancy Mapping**: Connecting the local interview configuration (role, company, skill parameters) to a CAPVIA vacancy ID.
2. **Enterprise Authentication**: Enforcing secure API keys, JWT access validation, and client-role restriction (rather than unauthenticated local requests).
3. **Remote Storage & Upload Pipeline**: Automatically uploading completed base64 videos to GCS/S3 buckets and storing JSON evaluations in relational databases instead of relying on `localStorage`.
4. **Interview Session Lifecycle Manager**: Orchestrating starting, answering, completing, and checking status from the backend rather than keeping state inside React.

### Proposed CAPVIA Integration Contract

The endpoints below form the proposed CAPVIA Integration Layer. All endpoints require an `X-CAPVIA-API-Key` or `Authorization: Bearer <JWT>` header.

```
POST /interview/start  -> Initializes interview and yields generated questions
        ↓
POST /interview/question -> Retrieves details for a specific question ID
        ↓
POST /interview/answer  -> Submits audio, video frames, and text transcript for a question
        ↓
POST /interview/complete -> Concludes session and triggers background evaluators
        ↓
GET  /interview/status   -> Polls running state of the evaluations
        ↓
GET  /interview/result   -> Retrieves final aggregated report
```

---

### 6.1. Initialize Interview (`POST /interview/start`)
* **Description**: Registers a candidate application, sets the job role/skills context, and triggers the AI engine to generate the 5 questions.
* **HTTP Method**: `POST`
* **Path**: `/api/v1/interview/start`
* **Authentication**: `X-CAPVIA-API-Key` (Header)
* **Request Schema (JSON)**:
  ```json
  {
    "application_id": "string (UUID, required)",
    "candidate_id": "string (UUID, required)",
    "candidate_name": "string (required)",
    "job_role": "string (required)",
    "skills": ["string"],
    "company_name": "string (required)",
    "llm_provider": "string (optional: 'ollama' | 'openai', default: 'ollama')"
  }
  ```
* **Validation Rules**:
  - `application_id` must be a valid UUID.
  - `skills` must contain between 1 and 10 items.
  - `job_role` and `company_name` cannot be empty.
* **Response Schema (JSON)**:
  ```json
  {
    "success": true,
    "session_id": "string (UUID)",
    "status": "initialized",
    "questions": [
      {
        "question_id": "string",
        "question_text": "string",
        "difficulty": "easy | medium | hard",
        "duration_sec": 60,
        "category": "technical | situational"
      }
    ],
    "created_at": "string (ISO 8601)"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing fields or invalid UUID format.
  * `401 Unauthorized`: Missing or invalid API key.
  * `502 Bad Gateway`: Local Ollama or OpenAI service failed to generate questions.
* **Example Request**:
  ```http
  POST /api/v1/interview/start HTTP/1.1
  Host: api.capvia-interview.com
  X-CAPVIA-API-Key: capvia_live_key_9f8d7c6b
  Content-Type: application/json

  {
    "application_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "candidate_id": "u9f8e7d6-c5b4-a3f2-e1d0-c9b8a7f6e5d4",
    "candidate_name": "Rohan Sharma",
    "job_role": "React Developer",
    "skills": ["React Hooks", "TypeScript", "State Management"],
    "company_name": "CAPVIA Tech"
  }
  ```
* **Example Response**:
  ```json
  {
    "success": true,
    "session_id": "s8r7q6p5-o4n3-m2l1-k0j9-i8h7g6f5e4d3",
    "status": "initialized",
    "questions": [
      {
        "question_id": "q1",
        "question_text": "What is the difference between a functional component and a class component in React?",
        "difficulty": "easy",
        "duration_sec": 60,
        "category": "technical"
      },
      {
        "question_id": "q2",
        "question_text": "Explain how the dependency array in useEffect works, and what happens when it is omitted.",
        "difficulty": "easy",
        "duration_sec": 75,
        "category": "technical"
      },
      {
        "question_id": "q3",
        "question_text": "Imagine a scenario where your React component is re-rendering too many times. How would you optimize it?",
        "difficulty": "medium",
        "duration_sec": 120,
        "category": "technical"
      },
      {
        "question_id": "q4",
        "question_text": "You are debugging a state update that seems to be one step behind. Walk me through how you identify and fix this issue.",
        "difficulty": "medium",
        "duration_sec": 120,
        "category": "technical"
      },
      {
        "question_id": "q5",
        "question_text": "Design a state management architecture for a massive dashboard app that has real-time location updates. What tools and paradigms would you use?",
        "difficulty": "hard",
        "duration_sec": 150,
        "category": "situational"
      }
    ],
    "created_at": "2026-06-16T12:05:00Z"
  }
  ```

---

### 6.2. Submit Answer Segment (`POST /interview/answer`)
* **Description**: Submits the candidate's spoken/transcribed answer, audio segment, and proctoring logs for a single question.
* **HTTP Method**: `POST`
* **Path**: `/api/v1/interview/answer`
* **Authentication**: `X-CAPVIA-API-Key` (Header)
* **Request Schema (Multipart Form-Data)**:
  * `session_id` (string, required): Active interview session UUID.
  * `question_id` (string, required): Question ID (e.g. `q1`).
  * `transcript` (string, optional): Captured text.
  * `audio_file` (Binary Stream, optional): Recorded voice bytes (WEBM/WAV).
  * `proctoring_frames_json` (string, required): Serialized JSON array of proctoring samples captured during the answer duration.
* **Validation Rules**:
  - `session_id` must match a active session in the database.
  - `proctoring_frames_json` must parse to a valid array of detection snapshots.
* **Response Schema (JSON)**:
  ```json
  {
    "success": true,
    "session_id": "string",
    "question_id": "string",
    "speech_metrics": {
      "words_per_minute": "integer",
      "filler_word_rate": "float",
      "speech_clarity_pct": "integer"
    },
    "proctoring_violations_detected": "integer",
    "saved_at": "string (ISO 8601)"
  }
  ```
* **Example Request**:
  ```http
  POST /api/v1/interview/answer HTTP/1.1
  Host: api.capvia-interview.com
  X-CAPVIA-API-Key: capvia_live_key_9f8d7c6b
  Content-Type: multipart/form-data; boundary=boundary456

  --boundary456
  Content-Disposition: form-data; name="session_id"

  s8r7q6p5-o4n3-m2l1-k0j9-i8h7g6f5e4d3
  --boundary456
  Content-Disposition: form-data; name="question_id"

  q1
  --boundary456
  Content-Disposition: form-data; name="transcript"

  functional components are just JavaScript functions that return JSX, whereas class components extend React Component and use render methods. Functional components use hooks.
  --boundary456
  Content-Disposition: form-data; name="proctoring_frames_json"

  [{"yaw": 0.5, "pitch": -0.2, "gaze": "CENTER", "phone": false, "timestamp": 177112090}]
  --boundary456--
  ```
* **Example Response**:
  ```json
  {
    "success": true,
    "session_id": "s8r7q6p5-o4n3-m2l1-k0j9-i8h7g6f5e4d3",
    "question_id": "q1",
    "speech_metrics": {
      "words_per_minute": 115,
      "filler_word_rate": 0.8,
      "speech_clarity_pct": 94
    },
    "proctoring_violations_detected": 0,
    "saved_at": "2026-06-16T12:06:30Z"
  }
  ```

---

### 6.3. Complete Interview Session (`POST /interview/complete`)
* **Description**: Finalizes the interview session, stops proctoring, registers the final video file, and schedules the final AI scoring.
* **HTTP Method**: `POST`
* **Path**: `/api/v1/interview/complete`
* **Authentication**: `X-CAPVIA-API-Key` (Header)
* **Request Schema (Multipart Form-Data)**:
  * `session_id` (string, required): Active session UUID.
  * `video_file` (Binary Stream, required): Complete recorded session WebM video file.
  * `local_violations_json` (string, required): JSON object detailing Electron/browser blurs and key shortcuts.
* **Response Schema (JSON)**:
  ```json
  {
    "success": true,
    "session_id": "string",
    "status": "processing_evaluation",
    "video_url": "string (GCS/S3 public or signed url)",
    "completed_at": "string (ISO 8601)"
  }
  ```
* **Example Response**:
  ```json
  {
    "success": true,
    "session_id": "s8r7q6p5-o4n3-m2l1-k0j9-i8h7g6f5e4d3",
    "status": "processing_evaluation",
    "video_url": "https://storage.googleapis.com/capvia-interview-videos/s8r7q6p5.webm",
    "completed_at": "2026-06-16T12:20:00Z"
  }
  ```

---

### 6.4. Poll Interview Evaluation Status (`GET /interview/status/{application_id}`)
* **Description**: Returns the processing state of the interview and evaluations.
* **HTTP Method**: `GET`
* **Path**: `/api/v1/interview/status/{application_id}`
* **Authentication**: `X-CAPVIA-API-Key` (Header)
* **Response Schema (JSON)**:
  ```json
  {
    "application_id": "string (UUID)",
    "session_id": "string (UUID)",
    "status": "not_started | in_progress | processing_evaluation | completed | failed",
    "progress_percent": 100,
    "error_message": "string | null",
    "updated_at": "string (ISO 8601)"
  }
  ```
* **Example Response**:
  ```json
  {
    "application_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "session_id": "s8r7q6p5-o4n3-m2l1-k0j9-i8h7g6f5e4d3",
    "status": "completed",
    "progress_percent": 100,
    "error_message": null,
    "updated_at": "2026-06-16T12:21:15Z"
  }
  ```

---

### 6.5. Get Aggregated Interview Result (`GET /interview/result/{application_id}`)
* **Description**: Retrieves the complete evaluated scoring report, proctoring violations, video links, and recommendations for HR review.
* **HTTP Method**: `GET`
* **Path**: `/api/v1/interview/result/{application_id}`
* **Authentication**: `X-CAPVIA-API-Key` (Header)
* **Response Schema (JSON)**:
  ```json
  {
    "success": true,
    "application_id": "string (UUID)",
    "session_id": "string (UUID)",
    "candidate_name": "string",
    "job_role": "string",
    "company_name": "string",
    "timestamp": "string (ISO 8601)",
    "video_url": "string (URL)",
    "metrics": {
      "overall_answer_score_pct": 78,
      "overall_integrity_score": 88,
      "cheating_probability_pct": 12,
      "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
      "recommendation": "Strong Hire | Consider | Review Required | Not Recommended"
    },
    "proctoring_report": {
      "focus_percentage": 92,
      "look_away_count": 2,
      "head_stability_pct": 95,
      "head_movements_count": 1,
      "face_visibility_pct": 100,
      "face_absences_count": 0,
      "multi_face_events": 0,
      "phone_detections_count": 0,
      "tab_switches": 0,
      "copy_pastes": 0,
      "suspicious_keys": 0,
      "violations": [
        {
          "type": "string",
          "severity": "string",
          "message": "string"
        }
      ]
    },
    "answer_evaluation": {
      "strengths": ["string"],
      "improvements": ["string"],
      "question_results": [
        {
          "question_id": "string",
          "question_text": "string",
          "difficulty": "easy | medium | hard",
          "transcript": "string",
          "score": 85,
          "verdict": "Correct | Partially Correct | Incorrect | No Answer",
          "feedback": "string",
          "keywords_used": ["string"],
          "missing_keywords": ["string"],
          "deep_dimensions": {
            "technical_correctness": 88,
            "depth_of_understanding": 82,
            "logical_reasoning": 85,
            "clarity_structure": 90,
            "communication_quality": 88,
            "confidence_level": 85,
            "problem_explanation": 80
          },
          "expert_summary": "string"
        }
      ]
    }
  }
  ```

---

## 7. Error Codes & Responses

Standardized API errors returned by the Integration Layer:

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_UUID_FORMAT` | The provided ID is not a valid UUID string. |
| `400 Bad Request` | `SESSION_COMPLETED` | Cannot modify or add answers to a completed session. |
| `401 Unauthorized` | `MISSING_API_KEY` | `X-CAPVIA-API-Key` or `Bearer Token` header is missing. |
| `401 Unauthorized` | `INVALID_API_KEY` | API Key signature verification failed. |
| `403 Forbidden` | `ACCESS_DENIED` | Client lacks permission to read result of this application. |
| `404 Not Found` | `APPLICATION_NOT_FOUND` | No interview application exists with the given ID. |
| `404 Not Found` | `SESSION_NOT_FOUND` | No active session exists with the given UUID. |
| `502 Bad Gateway` | `LLM_GENERATION_FAILED` | Local Ollama daemon or OpenAI returned an error. |
| `503 Service Unavailable` | `EVALUATION_SERVER_DOWN` | SentenceTransformers/KeyBERT Python service is unreachable. |

---

## 8. Implementation Notes

1. **Local-to-Cloud Video Uploads**:
   Instead of uploading 50MB WebM recordings as a single base64 payload inside JSON (which crashes the server memory), the React client should stream chunks to GCS/S3 using signed URLs, or upload the final file as multipart form-data inside `/interview/complete` where the server processes it asynchronously.
2. **LLM Orchestration**:
   Prompt templates should be maintained in a backend configuration table so that adjustments to question difficulty progression or tone do not require client application rebuilds.
3. **Temporal Proctoring (Debouncing)**:
   Ensure that the client implements the same 2-consecutive-frame debounce for phone detection and the 1.5-second time hold for multiple faces before counting proctoring violations to minimize false positives due to camera noise.
