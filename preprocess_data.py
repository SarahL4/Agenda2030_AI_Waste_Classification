import os
import json
import numpy as np
from PIL import Image
from tqdm import tqdm

def preprocess_dataset():
    # 数据集路径
    data_dir = './data'
    categories = ['glass', 'paper', 'cardboard', 'plastic', 'metal', 'trash']
    
    # 限制每个类别的图片数量
    MAX_IMAGES_PER_CATEGORY = 50  # 减少每类图片数量
    
    # 分块大小
    CHUNK_SIZE = 10
    
    # 检查数据目录是否存在
    if not os.path.exists(data_dir):
        print(f"Error: Data directory '{data_dir}' not found!")
        print("Please create a 'data' directory with the following structure:")
        print("data/")
        print("  ├── glass/")
        print("  ├── paper/")
        print("  ├── cardboard/")
        print("  ├── plastic/")
        print("  ├── metal/")
        print("  └── trash/")
        return
    
    # 输出目录
    output_dir = './trained_model/waste-classifier'
    os.makedirs(output_dir, exist_ok=True)
    
    # 存储预处理后的数据
    processed_data = {
        'images': [],
        'labels': [],
        'categories': categories
    }
    
    total_images = 0
    processed_images = 0
    
    # 处理每个类别
    for label, category in enumerate(categories):
        category_path = os.path.join(data_dir, category)
        if not os.path.exists(category_path):
            print(f"Warning: {category_path} not found")
            continue
            
        print(f"\nProcessing {category}...")
        
        # 获取该类别下的所有图片
        images = [f for f in os.listdir(category_path) 
                 if f.endswith(('.jpg', '.jpeg', '.png'))]
        # 限制图片数量
        images = images[:MAX_IMAGES_PER_CATEGORY]
        
        total_images += len(images)
        
        # 使用tqdm显示进度
        for img_name in tqdm(images, desc=f"Processing {category}"):
            img_path = os.path.join(category_path, img_name)
            try:
                # 加载并预处理图片
                img = Image.open(img_path)
                img = img.resize((160, 160))  # 调整大小
                img_array = np.array(img)
                
                # 确保图片是RGB格式
                if len(img_array.shape) != 3 or img_array.shape[2] != 3:
                    print(f"\nSkipping {img_path}: not RGB")
                    continue
                
                # 标准化
                img_array = img_array.astype('float32') / 255.0
                
                # 添加到数据集
                processed_data['images'].append(img_array.reshape(-1).tolist())
                processed_data['labels'].append(label)
                processed_images += 1
                
            except Exception as e:
                print(f"\nError processing {img_path}: {e}")
                continue
    
    if processed_images == 0:
        print("\nError: No images were successfully processed!")
        return
    
    print(f"\nSaving dataset...")
    # 将数据集分割成多个小文件
    num_chunks = (processed_images + CHUNK_SIZE - 1) // CHUNK_SIZE
    for i in range(num_chunks):
        start_idx = i * CHUNK_SIZE
        end_idx = min((i + 1) * CHUNK_SIZE, processed_images)
        
        chunk_data = {
            'images': processed_data['images'][start_idx:end_idx],
            'labels': processed_data['labels'][start_idx:end_idx],
            'categories': categories
        }
        
        chunk_file = os.path.join(output_dir, f'dataset_chunk_{i}.json')
        with open(chunk_file, 'w') as f:
            json.dump(chunk_data, f)
        
        print(f"Saved chunk {i+1}/{num_chunks}")
    
    # 保存元数据
    metadata = {
        'num_chunks': num_chunks,
        'total_images': processed_images,
        'categories': categories
    }
    with open(os.path.join(output_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f)
    
    print("\nDataset preprocessing complete!")
    print(f"Total images found: {total_images}")
    print(f"Successfully processed: {processed_images}")
    print(f"Dataset saved to: {output_dir}")

def check_requirements():
    try:
        import PIL
        import numpy
        import tqdm
        return True
    except ImportError as e:
        print(f"\nError: Missing required package - {e.name}")
        print("Please install required packages using:")
        print("pip install pillow numpy tqdm")
        return False

if __name__ == '__main__':
    if check_requirements():
        preprocess_dataset() 