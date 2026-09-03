import os
import xml.etree.ElementTree as ET

# Define the classes based on RDD2022 dataset
CLASSES = {
    "D00": 0, # Longitudinal Crack
    "D10": 1, # Transverse Crack
    "D20": 2, # Alligator Crack
    "D40": 3  # Pothole
}

def convert_box(size, box):
    # Convert Pascal VOC format (xmin, ymin, xmax, ymax) 
    # to YOLO format (center_x, center_y, width, height) normalized 0 to 1
    dw = 1. / size[0]
    dh = 1. / size[1]
    
    x = (box[0] + box[1]) / 2.0
    y = (box[2] + box[3]) / 2.0
    w = box[1] - box[0]
    h = box[3] - box[2]
    
    x = x * dw
    w = w * dw
    y = y * dh
    h = h * dh
    return (x, y, w, h)

def convert_annotation(xml_file_path, txt_file_path):
    tree = ET.parse(xml_file_path)
    root = tree.getroot()
    
    # Get image dimensions
    size = root.find('size')
    w = int(size.find('width').text)
    h = int(size.find('height').text)

    # If the XML somehow has a 0 width/height, skip it to avoid dividing by zero
    if w == 0 or h == 0:
        return

    out_file = open(txt_file_path, 'w')
    
    # Process each bounding box in the XML
    for obj in root.iter('object'):
        cls_name = obj.find('name').text
        
        # We only care about the classes defined in our dictionary
        if cls_name not in CLASSES:
            continue
            
        cls_id = CLASSES[cls_name]
        xmlbox = obj.find('bndbox')
        
        b = (float(xmlbox.find('xmin').text), float(xmlbox.find('xmax').text), 
             float(xmlbox.find('ymin').text), float(xmlbox.find('ymax').text))
             
        # Convert coordinates
        bb = convert_box((w, h), b)
        
        # Write to the .txt file: class_id center_x center_y width height
        out_file.write(str(cls_id) + " " + " ".join([str(a) for a in bb]) + '\n')
        
    out_file.close()

def main():
    # Define folder paths
    xml_dir = 'dataset/datasetpolehole/train/annotations/xmls'
    txt_dir = 'dataset/datasetpolehole/train/labels'
    

    # Create the labels folder if it doesn't exist
    if not os.path.exists(txt_dir):
        os.makedirs(txt_dir)

    print("Starting conversion...")
    
    # Loop through all XML files
    for filename in os.listdir(xml_dir):
        if not filename.endswith('.xml'):
            continue
            
        xml_path = os.path.join(xml_dir, filename)
        
        # Create corresponding .txt filename
        txt_filename = filename.replace('.xml', '.txt')
        txt_path = os.path.join(txt_dir, txt_filename)
        
        convert_annotation(xml_path, txt_path)

    print("Conversion complete! Your YOLO labels are ready in the 'dataset/datasetpolehole/train/labels' folder.")

if __name__ == '__main__':
    main()