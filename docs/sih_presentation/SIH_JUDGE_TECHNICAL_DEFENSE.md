# JUDGE TECHNICAL DEFENSE
**Q: What exactly is innovative?**
A: Closed-loop verification. Most apps report potholes. We track them, dispatch them, and use the next bus pass to independently verify the contractor's repair.

**Q: Is the model trained?**
A: For this prototype, we built the YOLOv8 architecture, tracking, and backend integration. The actual weights are a deterministic fallback to ensure a flawless presentation. We will train on an Indian road dataset post-SIH.

**Q: Why PostGIS?**
A: Standard databases can't efficiently answer "is this detection within 15 meters of an existing issue?" PostGIS ST_DWithin makes spatial fusion instantaneous.
