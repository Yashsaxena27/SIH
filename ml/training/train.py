import argparse
import logging
import torch
import sys

# Optional ultralytics import
try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_model(data_yaml: str, epochs: int = 50, batch_size: int = 16, imgsz: int = 640):
    """
    Trains a YOLOv8 nano model on the provided dataset config.
    """
    if not YOLO:
        logger.error("ultralytics package not installed. Run pip install ultralytics")
        sys.exit(1)
        
    device = "0" if torch.cuda.is_available() else "cpu"
    logger.info(f"Starting training on device: {device}")
    
    # Load a pretrained model
    model = YOLO('yolov8n.pt') 
    
    # Train the model
    # Note: data_yaml should define class 0 as "pothole"
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        project="ml_outputs",
        name="pothole_model",
        exist_ok=True,
        # Augmentations for road stability
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=0.0,
        translate=0.1,
        scale=0.5,
        shear=0.0,
        perspective=0.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
    )
    
    logger.info(f"Training complete. Model saved to ml_outputs/pothole_model/weights/best.pt")
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 Pothole Model")
    parser.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch", type=int, default=16)
    args = parser.parse_args()
    
    train_model(args.data, args.epochs, args.batch)
