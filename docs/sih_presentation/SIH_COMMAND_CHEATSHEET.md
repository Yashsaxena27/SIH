# COMMAND CHEATSHEET
docker-compose up -d --build (Start everything)
docker-compose exec backend python scripts/reset_demo_data.py (Reset state)
python ml/demo_video.py --bus-id BUS-1 (Simulate Bus 1)
python backend/scripts/test_e2e.py (Run full verification test)
docker-compose logs -f backend (Debug backend)
