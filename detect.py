from ultralytics import YOLO
import os

def main():
    print("Loading your newly trained AI brain...")
    # Load the best model generated from your 5-epoch training session
    model_path = r"C:\Users\ACER\sih2026\runs\detect\train\weights\best.pt"
    model = YOLO(model_path)
    
    # Step 1: Export the model to ONNX format (Crucial for Edge Devices like Raspberry Pi)
    print("Exporting model to ONNX format for super-fast Edge inference...")
    model.export(format="onnx")
    print("Export complete! You now have a lightweight best.onnx file!")
    
    # Step 2: Test the AI on a real image to see the bounding boxes
    # We will use India_000005.jpg, the same image we checked the XML for earlier!
    test_image_path = r"C:\Users\ACER\sih2026\dataset\datasetpolehole\train\images\India_000005.jpg"
    
    if os.path.exists(test_image_path):
        print(f"\nTesting the AI on a road image...")
        # Run the detection. 'save=True' tells YOLO to draw the boxes and save a new picture
        # 'conf=0.1' means it will show any prediction it is at least 10% confident about (since 5 epochs is a very short training run)
        results = model.predict(source=test_image_path, save=True, conf=0.1)
        
        print("\nSUCCESS! Open the VS Code explorer on the left.")
        print("Navigate to: runs -> detect -> predict")
        print("Open the image inside that folder to see the bounding box your AI drew!")
    else:
        print(f"Could not find the test image at {test_image_path}")

if __name__ == "__main__":
    main()
