# POTHOLE WALA — PRESENTER NOTES

## SLIDE 1: Title (0:00 - 0:15)
* **What to say:** "Good morning judges. We are team [Your Team Name], tackling problem statement SIH26124. Our project is POTHOLE WALA, and our goal is simple: We turn existing public buses into continuously moving urban sensors."
* **Transition:** "Let's look at why the current approach to road maintenance is broken."
* **Key Point:** Hook them immediately with the concept of using *existing* buses.

## SLIDE 2: Idea + Solution + Innovation (0:15 - 1:00)
* **What to say:** "Today, cities rely on citizens to report potholes. It's manual, inconsistent, and often stops at detection. Our solution runs in four automated steps: Buses SENSE the road. Edge AI DETECTS defects. The backend ACTS by fusing observations into actionable tickets. Finally, the next bus VERIFIES if the repair was actually done. That is our USP: We don't just detect the problem. We verify when it's fixed."
* **Transition:** "Here is the technical architecture making this possible."
* **Key Point:** Make sure to heavily emphasize the word "VERIFY". It separates you from every other pothole detection team.
* **Likely Question:** "How do you know it's the exact same pothole?" -> *Wait for Slide 3 to explain PostGIS.*

## SLIDE 3: Technical Architecture & Methodology (1:00 - 1:45)
* **What to say:** "This is our pipeline. The camera feeds a YOLO-compatible perception edge node which tracks objects to suppress duplicate frames. It sends a single JSON event to our FastAPI backend. Here is the magic: We use PostgreSQL with PostGIS. If Bus A and Bus B see a defect within 15 meters, `ST_DWithin` spatial fusion merges them into ONE issue, boosting its priority. The React dashboard updates instantly via Server-Sent Events."
* **Transition:** "While the architecture is robust, deploying this at city-scale has challenges."
* **Key Point:** Name-drop PostGIS and Spatial Fusion. That proves you are doing real engineering, not just wrapping an API.
* **Honesty Check:** If asked about the model: "For this prototype demo, we are using deterministic fallback inference to ensure presentation reliability, but the system natively consumes YOLOv8 weights."

## SLIDE 4: Feasibility, Risks & Mitigation (1:45 - 2:30)
* **What to say:** "We built this to be highly feasible. Instead of buying new survey cars, we piggyback on existing buses using commodity cameras. To mitigate the risk of spamming the database, we built temporal tracking on the edge and spatial fusion in the cloud. Most importantly, to mitigate the risk of contractors faking repairs, we built the automated bus-revisit verification loop."
* **Transition:** "When deployed, this creates a massive shift in urban impact."
* **Key Point:** Highlight the final row: Repair cannot be trusted blindly -> Independent bus revisit.

## SLIDE 5: Impact & Benefits (2:30 - 3:00)
* **What to say:** "The impact goes beyond just finding potholes. For citizens, it means safer roads. For municipalities, it means prioritized, actionable intelligence. But for public funds, it means absolute traceability. Every repair contractor is held accountable because tomorrow morning, the 7:00 AM bus is going to drive over that exact same spot and verify their work. Every bus journey becomes an observation."
* **Transition:** "Our tech stack is built on proven, open-source foundations."
* **Key Point:** The financial accountability angle is a huge winner for government judges.

## SLIDE 6: Research, Technologies & References (3:00 - 3:15)
* **What to say:** "Our system is built on scalable, open-source frameworks like Ultralytics YOLO, PostGIS, FastAPI, and React. Thank you, and we are now ready to show you the live demonstration."
* **Key Point:** End sharply. Transition immediately into the live software demo.
