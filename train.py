from ultralytics import YOLO

def main():
    print("Loading YOLOv8 Nano model...")
    # 'yolov8n.pt' is the smallest/fastest model, great for testing
    model = YOLO("yolov8n.pt") 
    
    print("Starting training...")
    # epochs=5 is a short test run. device="cpu" is safe in case you don't have an NVIDIA GPU set up.
    model.train(data="road_damage.yaml", epochs=5, imgsz=640, batch=4, device="cpu") 
    print("Training finished!")

if __name__ == '__main__':
    main()
