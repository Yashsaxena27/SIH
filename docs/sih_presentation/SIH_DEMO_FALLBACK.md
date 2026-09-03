# DEMO FALLBACK PROCEDURES
1. **Docker Fails:** Pre-install python environments. Run FastAPI and Vite locally via 
pm run dev and uvicorn main:app.
2. **SSE Disconnects:** Manually refresh the browser. The data is safely in PostgreSQL.
3. **ML Fails to Run:** The dashboard already has seeded data. Explain the ML concept using the pre-existing map markers.
4. **Database Corrupts:** Run docker-compose exec backend python scripts/reset_demo_data.py. Takes 1 second.
