# LIVE DEMO SCRIPT (3-5 Minutes)
**STEP 1: OVERVIEW (0:00-0:30)**
*Action:* Open http://localhost:5173/overview.
*Say:* "Instead of expensive fixed infrastructure, POTHOLE WALA turns existing public buses into mobile sensing units."

**STEP 2: INTELLIGENCE MAP (0:30-1:00)**
*Action:* Navigate to /intelligence.
*Say:* "Every detection is tied to precise GPS and timestamps."

**STEP 3: LIVE DETECTION (1:00-1:30)**
*Action:* Run python ml/demo_video.py --bus-id BUS-1.
*Say:* "Our edge pipeline processes video, tracks the defect to prevent duplicate frames, and sends the event. Watch the map update instantly via SSE."

**STEP 4: MULTI-BUS FUSION (1:30-2:00)**
*Action:* Run python ml/demo_video.py --bus-id BUS-2.
*Say:* "When Bus 2 sees the same pothole, PostGIS spatial matching fuses it. We don't get two complaints; we get one issue with higher confidence."

**STEP 5: TICKET CREATION (2:00-2:30)**
*Action:* Open the Issue. Click 'Create Ticket'.
*Say:* "Once prioritized, the issue automatically routes to the correct municipal department."

**STEP 6: REPAIR & VERIFY (2:30-3:30)**
*Action:* Move Ticket to 'Repair Reported'. Run 	est_e2e.py or explain the revisit.
*Say:* "This is our USP. When the contractor says it's fixed, the next bus verifies it. If the defect is gone, it's VERIFIED. If it's still there, it's REOPENED. We close the loop."
