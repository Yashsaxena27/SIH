"""
Offline Buffering System — stores detection events in a local SQLite database
when the bus has no network. Batch-syncs to the backend when back online.
"""

import sqlite3
import json
import os
import requests
from datetime import datetime

DB_PATH = "events_buffer.db"

def init_database():
    """Create the local SQLite database and events table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            latitude REAL,
            longitude REAL,
            damage_class TEXT,
            confidence REAL,
            severity TEXT,
            frame_image TEXT,
            synced INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()
    print("[BUFFER] Local SQLite database initialized.")

def save_event(event):
    """Save a detection event to the local database (offline queue)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO events (timestamp, latitude, longitude, damage_class, confidence, severity, frame_image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        event["timestamp"],
        event["latitude"],
        event["longitude"],
        event["class"],
        event["confidence"],
        event["severity"],
        event["frame_image"]
    ))
    conn.commit()
    conn.close()
    print(f"  [BUFFER] Event saved locally: {event['class']} (conf: {event['confidence']:.2f}) at ({event['latitude']}, {event['longitude']})")

def get_unsynced_events():
    """Retrieve all events that haven't been synced to the backend yet."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM events WHERE synced = 0')
    rows = cursor.fetchall()
    conn.close()
    
    events = []
    for row in rows:
        events.append({
            "id": row[0],
            "timestamp": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "class": row[4],
            "confidence": row[5],
            "severity": row[6],
            "frame_image": row[7]
        })
    return events

def mark_as_synced(event_ids):
    """Mark events as synced after successful upload to the backend."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for eid in event_ids:
        cursor.execute('UPDATE events SET synced = 1 WHERE id = ?', (eid,))
    conn.commit()
    conn.close()

def sync_to_backend(backend_url="http://localhost:5000/api/events"):
    """
    Batch-sync all unsynced events to the backend API.
    This is called when the bus comes back online.
    """
    events = get_unsynced_events()
    
    if not events:
        print("[SYNC] No unsynced events to send.")
        return
    
    print(f"\n[SYNC] Bus is BACK ONLINE! Syncing {len(events)} buffered events to backend...")
    
    try:
        response = requests.post(backend_url, json={"events": events})
        if response.status_code == 200:
            event_ids = [e["id"] for e in events]
            mark_as_synced(event_ids)
            print(f"[SYNC] SUCCESS! {len(events)} events synced to backend.")
        else:
            print(f"[SYNC] FAILED! Backend returned status {response.status_code}")
    except requests.ConnectionError:
        print("[SYNC] FAILED! Cannot reach backend server. Events remain in local buffer.")

def get_event_count():
    """Return the total number of events and unsynced events."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM events')
    total = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM events WHERE synced = 0')
    unsynced = cursor.fetchone()[0]
    conn.close()
    return total, unsynced