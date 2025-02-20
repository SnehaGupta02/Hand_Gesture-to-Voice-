import os
import cv2
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def augment_images(data_dir, output_dir):
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Data augmentation parameters (no rotation)
    datagen = ImageDataGenerator(
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )

    # Process each tag folder
    for label in os.listdir(data_dir):
        label_dir = os.path.join(data_dir, label)
        augmented_label_dir = os.path.join(output_dir, label)

        # Create output folder for augmented images
        if not os.path.exists(augmented_label_dir):
            os.makedirs(augmented_label_dir)

        for img_name in os.listdir(label_dir):
            img_path = os.path.join(label_dir, img_name)
            img = cv2.imread(img_path)
            img = cv2.resize(img, (128, 128))  # Resize to a fixed size
            img = np.expand_dims(img, axis=0)

            # Generate 50 augmented images for each original image
            i = 0
            for batch in datagen.flow(img, batch_size=1, save_to_dir=augmented_label_dir, save_prefix="aug", save_format="png"):
                i += 1
                if i >= 50:  # Stop after 50 augmentations
                    break

    print("Augmentation complete!")

# Paths
data_dir = "/home/prerna/Desktop/project/frontend/data"  # Replace with your dataset path
output_dir = "/home/prerna/Desktop/project/frontend/augmented_data"

# Run augmentation
augment_images(data_dir, output_dir)
