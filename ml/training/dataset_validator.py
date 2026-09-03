import os
import glob
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def validate_yolo_dataset(dataset_path: str):
    """
    Validates a YOLO format dataset.
    Expects:
    dataset_path/
      images/
        train/
        val/
      labels/
        train/
        val/
    """
    base_dir = Path(dataset_path)
    if not base_dir.exists():
        logger.error(f"Dataset path {dataset_path} does not exist.")
        return False
        
    splits = ["train", "val", "test"]
    is_valid = True
    
    total_images = 0
    total_labels = 0
    
    for split in splits:
        img_dir = base_dir / "images" / split
        lbl_dir = base_dir / "labels" / split
        
        if not img_dir.exists() and split != "test":
            logger.warning(f"Missing {split} image directory.")
            continue
            
        if not img_dir.exists():
            continue
            
        images = list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
        labels = list(lbl_dir.glob("*.txt")) if lbl_dir.exists() else []
        
        total_images += len(images)
        total_labels += len(labels)
        
        # Check label pairing
        for img_path in images:
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            if not lbl_path.exists():
                logger.error(f"Missing label for {img_path.name}")
                is_valid = False
                
        # Validate coordinates (0 to 1)
        for lbl_path in labels:
            with open(lbl_path, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) != 5:
                        logger.error(f"Malformed label in {lbl_path.name}")
                        is_valid = False
                        continue
                    
                    cls_id, x, y, w, h = map(float, parts)
                    if not (0 <= x <= 1 and 0 <= y <= 1 and 0 <= w <= 1 and 0 <= h <= 1):
                        logger.error(f"Bounding box out of bounds in {lbl_path.name}")
                        is_valid = False
                        
    logger.info(f"Validation Report:")
    logger.info(f"Total Images: {total_images}")
    logger.info(f"Total Labels: {total_labels}")
    
    if is_valid:
        logger.info("Dataset is valid and ready for training.")
    else:
        logger.error("Dataset validation failed.")
        
    return is_valid

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        validate_yolo_dataset(sys.argv[1])
    else:
        print("Usage: python dataset_validator.py <path_to_dataset>")
