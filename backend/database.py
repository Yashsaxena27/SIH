import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'events.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            class TEXT NOT NULL,
            confidence REAL NOT NULL,
            severity TEXT NOT NULL,
            image_path TEXT,
            synced_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Backend database initialized at", DB_PATH)

if __name__ == '__main__':
    init_db()
