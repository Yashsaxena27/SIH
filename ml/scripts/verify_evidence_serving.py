import os
import asyncio
import httpx
from app.main import app

async def check():
    files = [f for f in os.listdir("backend/evidence") if f.endswith(".jpg")]
    print(f"Evidence files on disk: {len(files)}")
    assert len(files) > 0, "No evidence files found in backend/evidence!"
    
    sample_file = files[0]
    file_path = os.path.join("backend/evidence", sample_file)
    size = os.path.getsize(file_path)
    print(f"Testing sample evidence: {sample_file} (Size: {size} bytes)")
    
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/evidence/{sample_file}")
        print(f"HTTP GET /evidence/{sample_file} -> Status: {res.status_code}")
        print(f"Content-Type: {res.headers.get('content-type')}")
        print(f"Content-Length: {len(res.content)} bytes")
        assert res.status_code == 200
        assert len(res.content) == size
        assert "image/jpeg" in res.headers.get("content-type", "")
        print("[PASS] Evidence static file serving is 100% verified!")

if __name__ == "__main__":
    asyncio.run(check())
