import httpx
import logging
import sqlite3
import json
import os
from typing import Dict, Any, Optional, List

from ml.core.config import settings

logger = logging.getLogger(__name__)

class BackendClient:
    """
    Client for transmitting detection and verification events to the FastAPI backend.
    Features an offline SQLite buffer that stores events when the network is unavailable
    and synchronizes them in batch when connectivity is restored.
    """

    def __init__(self, db_path: str = "events_buffer.db"):
        self.base_url = settings.BACKEND_URL.rstrip("/")
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Creates the local SQLite buffer table if it does not exist."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS event_buffer (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT UNIQUE,
                        event_json TEXT NOT NULL,
                        synced INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_synced ON event_buffer(synced)")
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to initialize SQLite offline buffer: {e}")

    def buffer_event(self, event_data: Dict[str, Any]) -> bool:
        """Stores an event locally in SQLite when backend is unreachable."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO event_buffer (event_id, event_json, synced)
                    VALUES (?, ?, 0)
                """, (event_data["event_id"], json.dumps(event_data)))
                conn.commit()
            logger.info(f"[BUFFER] Event {event_data['event_id']} saved to offline SQLite buffer.")
            return True
        except Exception as e:
            logger.error(f"Failed to buffer event in SQLite: {e}")
            return False

    def send_detection(self, event_data: Dict[str, Any]) -> bool:
        """
        Sends a DetectionEvent to the FastAPI backend.
        If offline, automatically buffers to SQLite so no field observation is lost.
        """
        url = f"{self.base_url}/ingestion/detection"
        try:
            response = httpx.post(url, json=event_data, timeout=3.0)
            if response.status_code == 200:
                logger.info(f"[ONLINE] Successfully transmitted detection {event_data['event_id']}")
                return True
            else:
                logger.warning(f"Backend returned {response.status_code}. Buffering event.")
                self.buffer_event(event_data)
                return False
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.warning(f"Network unavailable ({e}). Buffering event {event_data.get('event_id')}")
            self.buffer_event(event_data)
            return False

    def sync_buffered_events(self, batch_size: int = 50) -> int:
        """
        Batch-synchronizes unsynced events from the SQLite buffer to the backend.
        Returns the number of events successfully synchronized.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, event_id, event_json FROM event_buffer 
                    WHERE synced = 0 
                    ORDER BY id ASC 
                    LIMIT ?
                """, (batch_size,))
                rows = cursor.fetchall()

            if not rows:
                return 0

            events = [json.loads(row[2]) for row in rows]
            db_ids = [row[0] for row in rows]

            url = f"{self.base_url}/ingestion/detection/batch"
            response = httpx.post(url, json={"events": events}, timeout=15.0)

            if response.status_code == 200:
                resp_json = response.json()
                succeeded = resp_json.get("succeeded", 0)

                # Mark synced in SQLite
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    placeholders = ",".join("?" * len(db_ids))
                    cursor.execute(f"UPDATE event_buffer SET synced = 1 WHERE id IN ({placeholders})", db_ids)
                    conn.commit()

                logger.info(f"[SYNC] Successfully batch-synchronized {succeeded}/{len(events)} buffered events.")
                return succeeded
            else:
                logger.error(f"Batch sync failed with status {response.status_code}: {response.text}")
                return 0
        except Exception as e:
            logger.error(f"Exception during batch synchronization: {e}")
            return 0

    def get_unsynced_count(self) -> int:
        """Returns the number of events currently awaiting synchronization."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM event_buffer WHERE synced = 0")
                return cursor.fetchone()[0]
        except Exception:
            return 0

    def send_verification(self, issue_id: str, event_data: Optional[Dict[str, Any]] = None) -> bool:
        """Sends a verification revisit event to the backend."""
        url = f"{self.base_url}/ingestion/verification/{issue_id}"
        try:
            payload = event_data if event_data else None
            response = httpx.post(url, json=payload, timeout=5.0)
            if response.status_code == 200:
                logger.info(f"Successfully transmitted verification for {issue_id}")
                return True
            return False
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to backend for verification: {e}")
            return False
