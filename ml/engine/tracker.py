import numpy as np
from collections import OrderedDict
from ml.core.config import settings

class CentroidTracker:
    def __init__(self, max_disappeared=settings.TRACKING_MAX_DISAPPEARED, stability_frames=settings.TRACKING_STABILITY_FRAMES):
        self.next_object_id = 0
        self.objects = OrderedDict()
        self.disappeared = OrderedDict()
        self.hit_streak = OrderedDict()
        
        self.max_disappeared = max_disappeared
        self.stability_frames = stability_frames
        
        # We store the latest bbox for an object to retrieve it later
        self.bboxes = OrderedDict()
        
        # Keep track of objects that have been emitted as events to the backend
        self.emitted_objects = set()

    def register(self, centroid, bbox):
        self.objects[self.next_object_id] = centroid
        self.bboxes[self.next_object_id] = bbox
        self.disappeared[self.next_object_id] = 0
        self.hit_streak[self.next_object_id] = 1
        self.next_object_id += 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]
        del self.hit_streak[object_id]
        del self.bboxes[object_id]
        if object_id in self.emitted_objects:
            self.emitted_objects.remove(object_id)

    def update(self, rects):
        # rects is a list of [startX, startY, endX, endY]
        if len(rects) == 0:
            # If no detections, increment disappeared count for all tracked objects
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects, self.bboxes, []

        # Initialize array of input centroids
        input_centroids = np.zeros((len(rects), 2), dtype="int")
        
        for (i, (startX, startY, endX, endY)) in enumerate(rects):
            cX = int((startX + endX) / 2.0)
            cY = int((startY + endY) / 2.0)
            input_centroids[i] = (cX, cY)

        if len(self.objects) == 0:
            for i in range(0, len(input_centroids)):
                self.register(input_centroids[i], rects[i])
        else:
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())

            # Compute Euclidean distance between each pair of object centroids and input centroids
            # Note: For production, IoU tracking is more robust. Centroid is simple for demo.
            D = np.linalg.norm(np.array(object_centroids)[:, np.newaxis] - input_centroids, axis=2)

            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue

                # If distance > threshold, assume it's a different object (e.g., 50 pixels)
                if D[row, col] > 100:
                    continue

                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.bboxes[object_id] = rects[col]
                self.disappeared[object_id] = 0
                self.hit_streak[object_id] += 1

                used_rows.add(row)
                used_cols.add(col)

            # Check for disappeared objects
            unused_rows = set(range(0, D.shape[0])).difference(used_rows)
            for row in unused_rows:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)

            # Register new objects
            unused_cols = set(range(0, D.shape[1])).difference(used_cols)
            for col in unused_cols:
                self.register(input_centroids[col], rects[col])

        # Return the objects that reached stability but haven't been emitted yet
        ready_to_emit = []
        for obj_id, streak in self.hit_streak.items():
            if streak >= self.stability_frames and obj_id not in self.emitted_objects:
                ready_to_emit.append((obj_id, self.bboxes[obj_id]))
                self.emitted_objects.add(obj_id)
                
        return self.objects, self.bboxes, ready_to_emit
