import numpy as np
from sklearn.cluster import DBSCAN

def generate_hotspots(events):
    """
    Groups individual detection events into hotspots using DBSCAN.
    """
    if not events:
        return {"type": "FeatureCollection", "features": []}

    # Extract coordinates
    coords = np.array([[e['latitude'], e['longitude']] for e in events])
    
    # DBSCAN parameters (epsilon is distance, min_samples is minimum events to form a hotspot)
    # 0.001 degrees is roughly 100 meters
    epsilon = 0.001 
    min_samples = 2
    
    clustering = DBSCAN(eps=epsilon, min_samples=min_samples).fit(coords)
    labels = clustering.labels_
    
    hotspots = []
    unique_labels = set(labels)
    
    for label in unique_labels:
        if label == -1:
            continue # Noise (isolated events)
            
        # Get all events in this cluster
        cluster_events = [events[i] for i in range(len(events)) if labels[i] == label]
        
        # Calculate cluster center
        avg_lat = sum(e['latitude'] for e in cluster_events) / len(cluster_events)
        avg_lng = sum(e['longitude'] for e in cluster_events) / len(cluster_events)
        
        # Determine overall severity based on events count
        severity = "minor"
        if len(cluster_events) > 5:
            severity = "severe"
        elif len(cluster_events) > 2:
            severity = "moderate"
            
        hotspot = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [avg_lng, avg_lat] # GeoJSON uses [lng, lat]
            },
            "properties": {
                "id": f"hotspot_{label}",
                "event_count": len(cluster_events),
                "severity": severity,
                "classes_detected": list(set(e['class'] for e in cluster_events))
            }
        }
        hotspots.append(hotspot)
        
    return {
        "type": "FeatureCollection",
        "features": hotspots
    }
