# Data Flow

## Test Taking Flow
```
Candidate → Login → Receive JWT
JWT → Create Session → Get Questions
Answer → Submit → Auto-save every 30s
Final Submit → Batch Save → Trigger Evaluation
Celery Worker → AI Evaluation → Score Generation
Admin Dashboard ← WebSocket Updates ← Score Ready
```

## Real-time Monitoring
```
Candidate Browser → Behavioral Events → WebSocket → Admin Dashboard
                  ↓
            Behavior Store → Flagging → Alert System
```
