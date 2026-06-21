# Troubleshooting

## Common Issues

### "Cannot connect to API"
- Ensure the backend is running on port 8000
- Check VITE_API_URL in frontend .env

### "Database connection failed"
- Verify PostgreSQL is running
- Check DATABASE_URL in backend .env

### "AI evaluation not working"
- Ensure Ollama is running: `ollama serve`
- Pull the model: `ollama pull mistral`

### "WebSocket disconnects frequently"
- Check VITE_SOCKET_URL matches backend
- Ensure nginx is configured for WebSocket upgrades

## Logs
- Backend: `docker compose logs backend`
- Celery: `docker compose logs celery`
- Frontend: Browser developer console
