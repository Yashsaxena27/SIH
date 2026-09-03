import asyncio
import httpx
from app.main import app

async def verify_endpoints():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Road Health Summary
        res_summary = await client.get("/api/v1/analytics/roads/summary")
        assert res_summary.status_code == 200, f"Failed summary: {res_summary.text}"
        data_sum = res_summary.json()
        print("\n[1] GET /api/v1/analytics/roads/summary:")
        print("    Keys:", list(data_sum.keys()))
        print("    Total Roads:", data_sum.get("totalRoads"))
        print("    Total Defects:", data_sum.get("totalDefects"))
        print("    Segment Distribution:", data_sum.get("segmentDistribution"))
        assert "totalRoads" in data_sum and "totalDefects" in data_sum
        assert "segmentDistribution" in data_sum

        # 2. Road Segments
        res_segs = await client.get("/api/v1/analytics/road-segments")
        assert res_segs.status_code == 200
        data_segs = res_segs.json()
        print(f"\n[2] GET /api/v1/analytics/road-segments: {len(data_segs)} segments returned")
        if data_segs:
            sample_seg = data_segs[0]
            print("    Sample segment:", sample_seg.get("name"), "Health:", sample_seg.get("healthScore"), "Class:", sample_seg.get("roadClass"))
            assert "name" in sample_seg and "healthScore" in sample_seg

        # 3. Tickets
        res_tickets = await client.get("/api/v1/tickets")
        assert res_tickets.status_code == 200
        data_tickets = res_tickets.json()
        print(f"\n[3] GET /api/v1/tickets: {len(data_tickets)} tickets returned")
        if data_tickets:
            t = data_tickets[0]
            print("    Sample ticket:", t.get("displayId"), "Dept:", t.get("departmentName"), "Severity:", t.get("severity"), "SLA:", t.get("slaStatus"))
            assert "departmentName" in t
            assert "severity" in t
            assert "slaStatus" in t

        # 4. Tickets Summary
        res_tkt_sum = await client.get("/api/v1/tickets/summary")
        assert res_tkt_sum.status_code == 200
        tkt_sum = res_tkt_sum.json()
        print("\n[4] GET /api/v1/tickets/summary:")
        print("    Counts:", tkt_sum)
        assert "open" in tkt_sum or "total" in tkt_sum or "pending" in tkt_sum

    print("\n[PASS] All frontend API endpoints verified with correct response shapes!")

if __name__ == "__main__":
    asyncio.run(verify_endpoints())
