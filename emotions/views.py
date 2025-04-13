import cv2
import base64
import numpy as np
import os
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .models import EmotionResult
from .emotion_detection import detect_emotion, detect_emotion_from_frame


# ✅ Main Emotion Detection Page
def emotion_detection_view(request):
    """Renders the main emotion detection page."""
    return render(request, "emotions/index.html")


# ✅ Upload Image with Correct Path Handling
@csrf_exempt
def upload_image(request):
    if request.method == 'POST' and request.FILES.get('image'):
        image = request.FILES['image']
        img_np = np.frombuffer(image.read(), np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

        if img is None:
            return JsonResponse({'error': 'Failed to read image.'}, status=400)

        detected_emotion, confidence_score, health_tip = detect_emotion(img)  # Pass img (NumPy array)
        image_filename = f'uploads/{now().strftime("%Y%m%d_%H%M%S")}.jpg'
        image_path = os.path.join(settings.MEDIA_ROOT, image_filename)
        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        cv2.imwrite(image_path, img)

        result = EmotionResult.objects.create(
            emotion=detected_emotion,
            confidence=confidence_score,
            health_tip=health_tip,
            image=image_filename,
            detected_at=now()
        )

        image_url = f"{settings.MEDIA_URL}{image_filename}"
        return JsonResponse({
            'image': image_url,
            'emotion': detected_emotion,
            'confidence_score': confidence_score * 100,  # Convert to percentage
            'health_tip': health_tip
        })

    return JsonResponse({'error': 'Invalid request'}, status=400)


# ✅ Start Camera with Correct Image Path Handling
@csrf_exempt
def start_camera(request):
    """Capture frame from camera, detect emotion, and render the result page."""
    
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        return JsonResponse({'error': 'Failed to open camera'}, status=500)

    try:
        ret, frame = camera.read()

        if not ret:
            return JsonResponse({'error': 'Failed to capture image'}, status=500)

        # ✅ Perform emotion detection
        detected_emotion, confidence_score, health_tip = detect_emotion_from_frame(frame)

        # ✅ Save the image
        image_filename = f'uploads/{now().strftime("%Y%m%d_%H%M%S")}.jpg'
        image_path = os.path.join(settings.MEDIA_ROOT, image_filename)

        # Ensure the uploads directory exists
        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        
        # Save the frame as an image
        cv2.imwrite(image_path, frame)

        # ✅ Save result in the database
        result = EmotionResult.objects.create(
            emotion=detected_emotion,
            confidence=confidence_score,
            health_tip=health_tip,
            image=image_filename,
            detected_at=now()
        )

        # ✅ Use MEDIA_URL for image rendering
        image_url = f"{settings.MEDIA_URL}{image_filename}"

        # ✅ Return JSON response for AJAX requests
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'emotion': detected_emotion,
                'confidence_score': confidence_score,
                'health_tip': health_tip,
                'image_url': image_url
            })

        # ✅ Render result.html for standard form submissions
        context = {
            'emotion': detected_emotion,
            'confidence_score': confidence_score,
            'health_tip': health_tip,
            'uploaded_image_url': image_url
        }

        return render(request, "emotions/result.html", context)

    finally:
        camera.release()


# ✅ Render Result Page with Correct Image Path
def detect(request):
    """Renders the result page with detection data."""
    
    image_url = request.GET.get('image', '')
    emotion = request.GET.get('emotion', 'N/A')
    confidence = request.GET.get('confidence', '0')
    health_tip = request.GET.get('tip', 'No tip available')

    # ✅ Use the correct MEDIA_URL prefix
    if not image_url.startswith(settings.MEDIA_URL):
        image_url = f"{settings.MEDIA_URL}{image_url}"

    context = {
        'uploaded_image_url': image_url,
        'emotion': emotion,
        'confidence_score': float(confidence),
        'health_tip': health_tip
    }

    return render(request, 'emotions/result.html', context)

@csrf_exempt
def save_result_view(request):
    """Saves the detected result into the database and redirects to the main page."""
    
    if request.method == 'POST':
        emotion = request.POST.get('emotion')
        confidence_score = float(request.POST.get('confidence_score'))
        health_tip = request.POST.get('health_tip')
        image = request.FILES.get('image')

        if image:
            # ✅ Save the image to the media folder
            image_filename = f'uploads/{now().strftime("%Y%m%d_%H%M%S")}.jpg'
            image_path = os.path.join(settings.MEDIA_ROOT, image_filename)

            # Ensure the uploads directory exists
            os.makedirs(os.path.dirname(image_path), exist_ok=True)

            # Save image to disk
            with open(image_path, 'wb') as f:
                for chunk in image.chunks():
                    f.write(chunk)
        else:
            image_filename = None

        # ✅ Save result in the database
        EmotionResult.objects.create(
            emotion=emotion,
            confidence=confidence_score,
            health_tip=health_tip,
            image=image_filename,
            detected_at=now()
        )

        # ✅ Return JSON response for AJAX requests
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'message': 'Result saved successfully!'})
        
        # ✅ For non-AJAX requests, redirect to the home page
        return redirect('emotion_detection_view')

    return JsonResponse({'error': 'Invalid request'}, status=400)

def download_pdf(request, result_id):
    result = EmotionResult.objects.get(id=result_id)

    pdf_filename = f"emotion_report_{result_id}.pdf"
    pdf_path = os.path.join(settings.MEDIA_ROOT, pdf_filename)

    generate_emotion_pdf(result, pdf_path)

    return FileResponse(open(pdf_path, 'rb'), as_attachment=True, filename=pdf_filename)
