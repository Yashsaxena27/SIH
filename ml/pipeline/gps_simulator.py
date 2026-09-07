"""
Simulates a transit vehicle moving along canonical demonstration corridors.
Primary Default: Delhi-NCR Corridor (SEG-DEL-NCR-01: AIIMS/Ring Road -> Ashram Chowk).
Legacy Fallback: Bengaluru Route (MG Road -> Koramangala).
"""
from typing import Tuple, List

DELHI_NCR_ROUTE: List[Tuple[float, float]] = [
    # --- Delhi PWD Corridor (SEG-DEL-NCR-01: 28.5355, 77.2090 to 28.5750, 77.2250) ---
    (28.5355, 77.2090),   # AIIMS / Ring Road Corridor start
    (28.5450, 77.2130),   # Andrews Ganj
    (28.5550, 77.2170),   # Moolchand Flyover
    (28.5650, 77.2210),   # Lajpat Nagar
    (28.5750, 77.2250),   # Ashram Chowk (Corridor end)
]

BENGALURU_ROUTE: List[Tuple[float, float]] = [
    # --- MG Road Route (R-MGR: 77.5946, 12.9716 to 77.6070, 12.9740) ---
    (12.9716, 77.5946),   # MG Road start (seed start)
    (12.9720, 77.5977),   # MG Road seg 1-2 boundary
    (12.9724, 77.6008),   # MG Road seg 2-3 boundary
    (12.9728, 77.6039),   # MG Road seg 3-4 boundary
    (12.9740, 77.6070),   # MG Road end (seed end)
    
    # --- Transition between routes ---
    (12.9680, 77.6100),   # Intermediate corridor
    (12.9600, 77.6140),   # Intermediate corridor
    (12.9520, 77.6180),   # Approaching Koramangala
    (12.9460, 77.6210),   # Approaching Koramangala
    
    # --- Koramangala 100ft Route (R-KOR: 77.6240, 12.9350 to 77.6300, 12.9400) ---
    (12.9400, 77.6230),   # Koramangala approach
    (12.9350, 77.6240),   # Koramangala start (seed start)
    (12.9363, 77.6255),   # Koramangala seg 1-2 boundary
    (12.9375, 77.6270),   # Koramangala seg 2-3 boundary
    (12.9388, 77.6285),   # Koramangala seg 3-4 boundary
    (12.9400, 77.6300),   # Koramangala end (seed end)
]

def get_gps_for_frame(frame_index: int, total_frames: int, route_name: str = "DELHI_NCR") -> Tuple[float, float]:
    """
    Given the current frame index and total frames in the video,
    return an interpolated (latitude, longitude) along the specified route.
    Default: Delhi-NCR canonical corridor (DELHI_NCR).
    Legacy: BENGALURU.
    """
    active_route = BENGALURU_ROUTE if route_name.upper() == "BENGALURU" else DELHI_NCR_ROUTE
    
    progress = frame_index / max(total_frames - 1, 1)
    progress = max(0.0, min(1.0, progress))
    
    route_position = progress * (len(active_route) - 1)
    lower_index = int(route_position)
    upper_index = min(lower_index + 1, len(active_route) - 1)
    
    fraction = route_position - lower_index
    
    lat = active_route[lower_index][0] + fraction * (active_route[upper_index][0] - active_route[lower_index][0])
    lng = active_route[lower_index][1] + fraction * (active_route[upper_index][1] - active_route[lower_index][1])
    
    return round(lat, 6), round(lng, 6)
