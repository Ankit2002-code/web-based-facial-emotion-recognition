# train_model.py
import os
import cv2
import numpy as np
from tensorflow.keras.models import load_model, Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Dense, Flatten, Dropout
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'testdata')
MODEL_PATH = os.path.join(BASE_DIR, 'emotions', 'model_file_30epochs.h5')
NEW_MODEL_PATH = os.path.join(BASE_DIR, 'emotions', 'model_file_updated.h5')

# Emotions list (must match your dataset folders)
EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Load and preprocess data
def load_data(data_dir):
    images = []
    labels = []
    for label_idx, emotion in enumerate(EMOTIONS):
        folder_path = os.path.join(data_dir, emotion)
        if not os.path.exists(folder_path):
            print(f"Warning: {folder_path} does not exist")
            continue
        for filename in os.listdir(folder_path):
            img_path = os.path.join(folder_path, filename)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)  # Grayscale for 48x48 input
            if img is not None:
                img = cv2.resize(img, (48, 48))
                images.append(img)
                labels.append(label_idx)
    return np.array(images), np.array(labels)

# Load train and test data
train_images, train_labels = load_data(os.path.join(DATA_DIR, 'train'))
test_images, test_labels = load_data(os.path.join(DATA_DIR, 'test'))

# Normalize and reshape data
train_images = train_images / 255.0
test_images = test_images / 255.0
train_images = train_images.reshape(-1, 48, 48, 1)  # Add channel dimension
test_images = test_images.reshape(-1, 48, 48, 1)

# Data augmentation
datagen = ImageDataGenerator(
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

# Load existing model or create new one
if os.path.exists(MODEL_PATH):
    print("Loading existing model...")
    model = load_model(MODEL_PATH)
else:
    print("Creating new model...")
    model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(48, 48, 1)),
        MaxPooling2D((2, 2)),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Flatten(),
        Dense(128, activation='relu'),
        Dropout(0.5),
        Dense(len(EMOTIONS), activation='softmax')
    ])

# Compile the model
model.compile(optimizer=Adam(learning_rate=0.0001),
              loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])

# Train the model
history = model.fit(
    datagen.flow(train_images, train_labels, batch_size=32),
    epochs=50,  # Increase epochs for better training
    validation_data=(test_images, test_labels)
)

# Evaluate the model
loss, accuracy = model.evaluate(test_images, test_labels)
print(f"Test accuracy: {accuracy*100:.2f}%")

# Save the updated model
model.save(NEW_MODEL_PATH)
print(f"Model saved to {NEW_MODEL_PATH}")