"""
Simulates a bus moving along a real Delhi road route.
GPS coordinates are from a stretch of Ring Road, Delhi.
"""

# Real GPS coordinates along Ring Road, Delhi (from Google Maps)
DELHI_ROUTE = [
    (28.6129, 77.2295),  # India Gate area
    (28.6145, 77.2320),
    (28.6162, 77.2350),
    (28.6180, 77.2378),
    (28.6198, 77.2405),
    (28.6215, 77.2430),
    (28.6233, 77.2458),  # Pragati Maidan
    (28.6250, 77.2485),
    (28.6268, 77.2510),
    (28.6285, 77.2538),
    (28.6303, 77.2565),
    (28.6320, 77.2590),
    (28.6338, 77.2618),  # ITO area
    (28.6355, 77.2645),
    (28.6373, 77.2670),
    (28.6390, 77.2698),
    (28.6408, 77.2725),
    (28.6425, 77.2750),
    (28.6443, 77.2778),
    (28.6460, 77.2805),  # ISBT Kashmere Gate
]

def get_gps_for_frame(frame_index, total_frames):
    """
    Given the current frame index and total frames in the video,
    return an interpolated (latitude, longitude) along the Delhi route.
    """
    # Calculate how far along the route we are (0.0 to 1.0)
    progress = frame_index / max(total_frames - 1, 1)
    
    # Map progress to a position in our route list
    route_position = progress * (len(DELHI_ROUTE) - 1)
    
    # Get the two nearest GPS points to interpolate between
    lower_index = int(route_position)
    upper_index = min(lower_index + 1, len(DELHI_ROUTE) - 1)
    
    # How far between the two points (0.0 to 1.0)
    fraction = route_position - lower_index
    
    # Linear interpolation between the two GPS points
    lat = DELHI_ROUTE[lower_index][0] + fraction * (DELHI_ROUTE[upper_index][0] - DELHI_ROUTE[lower_index][0])
    lng = DELHI_ROUTE[lower_index][1] + fraction * (DELHI_ROUTE[upper_index][1] - DELHI_ROUTE[lower_index][1])
    
    return round(lat, 6), round(lng, 6)