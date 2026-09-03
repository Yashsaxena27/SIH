from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from database import get_db_connection, init_db
import clustering

app = Flask(__name__)
CORS(app)  # Allow frontend to access the API

# Initialize database on startup
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/events', methods=['POST'])
def receive_event():
    data = request.json
    
    # If edge pipeline sends a batch of events
    if isinstance(data, list):
        events = data
    else:
        events = [data]
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    saved_count = 0
    for event in events:
        try:
            cursor.execute('''
                INSERT INTO events (timestamp, latitude, longitude, class, confidence, severity, image_path)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                event.get('timestamp'),
                event.get('latitude'),
                event.get('longitude'),
                event.get('class'),
                event.get('confidence'),
                event.get('severity'),
                event.get('frame_image', '')
            ))
            saved_count += 1
        except Exception as e:
            print("Error saving event:", e)
            
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success", "message": f"Saved {saved_count} events"}), 201


@app.route('/api/events', methods=['GET'])
def get_events():
    conn = get_db_connection()
    events = conn.execute('SELECT * FROM events ORDER BY timestamp DESC').fetchall()
    conn.close()
    
    return jsonify([dict(ix) for ix in events])


@app.route('/api/hotspots', methods=['GET'])
def get_hotspots():
    conn = get_db_connection()
    events = conn.execute('SELECT * FROM events').fetchall()
    conn.close()
    
    event_list = [dict(ix) for ix in events]
    hotspots = clustering.generate_hotspots(event_list)
    
    return jsonify(hotspots)


if __name__ == '__main__':
    print("Starting SIH Flask Backend on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
