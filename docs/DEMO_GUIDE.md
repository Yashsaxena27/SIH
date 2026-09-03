# SIH Presentation Demo Guide

This guide ensures a flawless, deterministic presentation for the Smart India Hackathon judges.

## Prerequisites
1. Ensure Docker Desktop is running.
2. Ensure you have run the reset script:
   ```bash
   python backend/scripts/reset_demo_data.py
   ```
3. Start the infrastructure:
   ```bash
   docker-compose up -d --build
   ```

## The Presentation Sequence (3 Minutes)

### 1. The Overview (0:00 - 0:30)
* **Action:** Open `http://localhost:5173` to the Dashboard.
* **Narrative:** "Welcome to the Mobile Urban Intelligence Network. Unlike traditional apps where citizens manually report potholes, our system turns every public bus into an automated road inspector. Here you see our active fleet and current road health."

### 2. Live Detection & Spatial Fusion (0:30 - 1:15)
* **Action:** Keep the Intelligence Map open on the screen. In a separate terminal, run:
  ```bash
  python ml/demo_video.py --bus-id BUS-1
  ```
* **Narrative:** "Let's simulate Bus 1 driving its route. It just ran over a pothole. (Point to map). You can see the new issue popped up instantly via SSE, no refresh required."
* **Action:** Run the script again, simulating a second bus:
  ```bash
  python ml/demo_video.py --bus-id BUS-2
  ```
* **Narrative:** "Now Bus 2 drives by the same spot an hour later. Notice the map didn't create a second marker. It performed PostGIS Spatial Fusion, realizing it's the exact same pothole. If you click it, the observation count is now 2, and its Priority Score has automatically increased."

### 3. Repair & Closed-Loop Verification (1:15 - 2:30)
* **Action:** Go to Tickets. Click the issue and mark it as "Repair Reported".
* **Narrative:** "The municipality goes out and fills the pothole. But we don't just take their word for it. The ticket enters a 'Verification Pending' state."
* **Action:** Run the automated end-to-end verification script to simulate the bus revisiting the repaired road:
  ```bash
  python backend/scripts/test_e2e.py
  ```
* **Narrative:** "Tomorrow, Bus 1 drives its normal route again. The ML model analyzes the repaired asphalt, confirms the defect is gone, and automatically closes the ticket as 'Verified'. If the patch was bad, it would have 'Reopened' it. This is true closed-loop accountability."

## Recovery 
If you click the wrong button or need to restart the presentation:
```bash
python backend/scripts/reset_demo_data.py
```
This takes 2 seconds and restores the perfect starting state.
