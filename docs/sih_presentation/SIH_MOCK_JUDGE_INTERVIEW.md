# MOCK JUDGE INTERVIEW
**Q: How do you avoid duplicate complaints from 50 buses?**
*Ideal:* "PostGIS spatial clustering. If 50 buses see the same location, we get 1 Urban Issue with an Observation Count of 50, which bumps its priority."
*Do NOT Say:* "The AI figures it out."

**Q: What happens if the internet goes down on the bus?**
*Ideal:* "The Edge device uses an offline SQLite buffer. It timestamps the detections and syncs to the backend via bulk POST when cellular connection is restored."
