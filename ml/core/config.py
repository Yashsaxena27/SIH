from pydantic_settings import BaseSettings, SettingsConfigDict

class MLSettings(BaseSettings):
    # Model config
    MODEL_NAME: str = "pothole-yolov8"
    MODEL_VERSION: str = "v1.0"
    MODEL_PATH: str = "models/pothole_v1.pt"
    MOCK_ML_MODE: bool = True
    
    # Inference config
    CONFIDENCE_THRESHOLD: float = 0.50
    IOU_THRESHOLD: float = 0.45
    DEVICE: str = "" # Empty means auto-detect (cuda if available, else cpu)
    
    # Tracking config
    TRACKING_STABILITY_FRAMES: int = 5 # How many consecutive frames an object must appear to be valid
    TRACKING_MAX_DISAPPEARED: int = 15 # How many frames it can disappear before track is lost
    
    # Backend Integration
    BACKEND_URL: str = "http://localhost:8000/api/v1"
    
    # App
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = MLSettings()
