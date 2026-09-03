import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class MLSettings(BaseSettings):
    # Model config
    MODEL_NAME: str = "road-damage-yolov8"
    MODEL_VERSION: str = "v1.0"
    MODEL_PATH: str = "ml/models/best.pt"
    MOCK_ML_MODE: bool = False
    
    # Inference config
    CONFIDENCE_THRESHOLD: float = float(os.environ.get("ML_CONFIDENCE_THRESHOLD", "0.10"))
    IOU_THRESHOLD: float = float(os.environ.get("ML_IOU_THRESHOLD", "0.45"))
    INFERENCE_FPS: int = int(os.environ.get("ML_INFERENCE_FPS", "1"))
    DEVICE: str = os.environ.get("ML_DEVICE", "cpu") # Default CPU
    
    # Tracking config
    TRACKING_STABILITY_FRAMES: int = int(os.environ.get("ML_TRACKING_STABILITY_FRAMES", "1")) # Consecutive sampled frames before emitting
    TRACKING_MAX_DISAPPEARED: int = int(os.environ.get("ML_TRACKING_MAX_DISAPPEARED", "10")) # Frames before track is lost
    
    # Storage & Evidence
    EVIDENCE_DIR: str = "backend/evidence"
    
    # Backend Integration
    BACKEND_URL: str = "http://localhost:8000/api/v1"
    
    # App
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def RESOLVED_MODEL_PATH(self) -> str:
        """Resolve model path whether run from root, backend, or ml directory."""
        if os.path.exists(self.MODEL_PATH):
            return self.MODEL_PATH
        # Try relative to ml directory
        alt_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "best.pt"))
        if os.path.exists(alt_path):
            return alt_path
        # Try from current working directory
        cwd_alt = os.path.join(os.getcwd(), "ml", "models", "best.pt")
        if os.path.exists(cwd_alt):
            return cwd_alt
        return self.MODEL_PATH

    @property
    def RESOLVED_EVIDENCE_DIR(self) -> str:
        """Resolve evidence storage directory."""
        if os.path.exists(self.EVIDENCE_DIR):
            return self.EVIDENCE_DIR
        alt_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "evidence"))
        return alt_path

settings = MLSettings()
