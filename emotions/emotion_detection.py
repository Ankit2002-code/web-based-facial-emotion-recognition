import cv2
import numpy as np
import os
from keras.models import load_model
from django.conf import settings

MODEL_PATH = os.path.join(settings.BASE_DIR, 'emotions', 'model_file_updated.h5')
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
model = load_model(MODEL_PATH)

EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

def preprocess_image(image):
    """
    Preprocesses the image for emotion detection model.
    - Converts to grayscale
    - Detects faces
    - Resizes the face for the model
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    if len(faces) == 0:
        return None, None  # No face detected

    largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
    x, y, w, h = largest_face
    face = gray[y:y + h, x:x + w]
    face = cv2.resize(face, (48, 48))
    face = np.expand_dims(face, axis=0)      # Shape: (1, 48, 48)
    face = np.expand_dims(face, axis=-1)     # Shape: (1, 48, 48, 1)
    face = face / 255.0                      # Normalize the image
    return face, (x, y, w, h)

def detect_emotion_from_frame(frame):
    """
    Detect emotion from a frame (NumPy array).
    """
    face, bbox = preprocess_image(frame)
    if face is None:
        return "No face detected", 0.0, "No health tip available"

    predictions = model.predict(face)[0]
    max_index = np.argmax(predictions)
    detected_emotion = EMOTIONS[max_index]
    confidence_score = float(predictions[max_index])

    health_tips = {
        "Happy": "Keep smiling! Laughter is the best medicine.",
        "Sad": "Engage in activities you enjoy or talk to someone.",
        "Angry": "Take a deep breath. Try a relaxation technique.",
        "Fear": "Practice deep breathing to calm your mind.",
        "Surprise": "Enjoy the moment! Surprise can be positive too.",
        "Neutral": "Stay relaxed and keep maintaining a balanced mood.",
        "Disgust": "Take a walk or distract yourself with something positive."
    }
    health_tip = health_tips.get(detected_emotion.capitalize(), "No health tip available")
    return detected_emotion, confidence_score, health_tip

def detect_emotion(image_input):
    """
    Detect emotion from either a file path (string) or an image array (NumPy array).
    """
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            print(f"Image file not found: {image_input}")
            return "File not found", 0.0, "No health tip available"
        image = cv2.imread(image_input)
        if image is None:
            print(f"Failed to read image: {image_input}")
            return "Invalid image", 0.0, "No health tip available"
    elif isinstance(image_input, np.ndarray):
        image = image_input
    else:
        print(f"Invalid input type: {type(image_input)}")
        return "Invalid input", 0.0, "No health tip available"

    return detect_emotion_from_frame(image)