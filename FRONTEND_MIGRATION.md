# CAPVIA Frontend Migration Manual

This document outlines the step-by-step procedure to migrate and merge UI code from ATS, Simulation, and Interview repositories into the main Next.js Gateway app.

---

## Step 1: Align Package Dependencies
Ensure the target Next.js `package.json` at `capvia_platform/frontend` includes all required libraries:
1.  **Shared Styling / Animations**: `framer-motion`, `lucide-react`, `tailwindcss`, `@tailwindcss/typography`
2.  **Simulation Subsystem**: `@monaco-editor/react`, `monaco-editor`, `socket.io-client`, `date-fns`
3.  **ATS Subsystem**: `d3`, `react-dropzone`, `react-hook-form`, `@hookform/resolvers`, `zod`
4.  **Utilities**: `axios`, `zustand`, `js-cookie`, `jwt-decode`

Run `npm install` inside the target Next.js folder to synchronize versions.

---

## Step 2: Copy Feature Source Files
Transfer pages and components from the source folders to the Next.js `src/features/` folder:

### 1. ATS Subsystem Migration
*   **Source**: [ats_resume/frontend/app](file:///Volumes/KINGSTON/CAPVIA/ats_resume/frontend/app)
*   **Destination**: [capvia_platform/frontend/src/features/ats](file:///Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/src/features/ats)
*   *Action*: Copy all resume parsing, keyword matching grids, heatmap components, and API connectors. Translate SWR hooks or SWR calls to React Query or keep them standard.

### 2. Simulation Subsystem Migration
*   **Source**: [ai_simulation/frontend/src](file:///Volumes/KINGSTON/CAPVIA/ai_simulation/frontend/src)
*   **Destination**: [capvia_platform/frontend/src/features/simulation](file:///Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/src/features/simulation)
*   *Action*: Copy `pages/candidate/SimulationInterface.tsx`, socket connectors, and compiler handlers.

### 3. Interview Subsystem Migration
*   **Source**: [ai_interview/src](file:///Volumes/KINGSTON/CAPVIA/ai_interview/src)
*   **Destination**: [capvia_platform/frontend/src/features/interview](file:///Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/src/features/interview)
*   *Action*: Copy webcam capturing, Speech-to-Text hooks (`useSpeechRecognition`), Text-to-Speech handlers (`ttsService.ts`), and MediaPipe landmarks processing (`useBrowserFaceDetection.ts`).

---

## Step 3: API Endpoint Preservation
The backend microservice endpoints remain unchanged. Ensure API client base URLs point to their corresponding running ports on localhost:
*   **Core Backend**: `http://localhost:8000/api/v1` (Port 8000)
*   **ATS Backend**: `http://localhost:8001/api/v1` (Port 8001)
*   **Simulation Backend**: `http://localhost:8002/api/v1` (Port 8002)
*   **Interview Backend (AI Evaluation)**: `http://localhost:8765` (Port 8765)

Declare these environment variables in `.env.local` inside the main Next.js project.

---

## Step 4: Code Refactoring (Vite/React to Next.js)
1.  **React Router to Next.js Navigation**: Replace `useNavigate` from `react-router-dom` with `useRouter` from `next/navigation`.
2.  **Client-only Wrappers**: Wrap client-heavy pages (like the Monaco Editor and MediaPipe WebRTC streams) inside `useClient` boundaries and disable Server-Side Rendering (SSR) to prevent compilation failures.
3.  **Local Storage Access**: Ensure all calls to `localStorage` or `sessionStorage` are enclosed within `typeof window !== 'undefined'` checks.
