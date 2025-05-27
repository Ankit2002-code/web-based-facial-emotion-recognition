
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.models import User
from .models import Profile
from emotions.models import EmotionResult
from datetime import datetime, timedelta
import random

HEALTH_TIPS = [
    "Regular exercise can improve your mood and reduce stress.",
    "Getting enough sleep is crucial for emotional well-being.",
    "Deep breathing exercises can help manage stress and anxiety.",
    "Maintaining social connections is important for mental health.",
    "Eating a balanced diet can positively affect your emotions.",
    "Practicing gratitude daily can improve your overall happiness.",
    "Taking short breaks during work can prevent emotional burnout."
]

def dashboard_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    
    # Get user's emotion results
    emotion_results = EmotionResult.objects.all().order_by('-detected_at')[:10]
    
    # Calculate statistics
    total_sessions = EmotionResult.objects.count()
    
    # Get most common emotion
    from django.db.models import Count
    most_common = EmotionResult.objects.values('emotion').annotate(count=Count('emotion')).order_by('-count').first()
    most_common_emotion = most_common['emotion'] if most_common else 'N/A'
    
    # Calculate average confidence
    from django.db.models import Avg
    avg_confidence = EmotionResult.objects.aggregate(avg_conf=Avg('confidence'))['avg_conf'] or 0
    
    # Get a random health tip
    daily_tip = random.choice(HEALTH_TIPS)
    
    # Prepare emotion data for chart
    emotion_data = {}
    for result in EmotionResult.objects.all():
        emotion = result.emotion.lower()
        emotion_data[emotion] = emotion_data.get(emotion, 0) + 1
    
    context = {
        'user': request.user,
        'daily_tip': daily_tip,
        'total_sessions': total_sessions,
        'most_common_emotion': most_common_emotion,
        'avg_confidence': round(avg_confidence * 100, 1),  # Convert to percentage
        'emotion_logs': emotion_results,
        'emotion_data': emotion_data,
    }
    
    return render(request, 'users/dashboard.html', context)


def logout_view(request):
    logout(request)
    return redirect('login')

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('dashboard')  # Redirect to dashboard after successful login
        else:
            messages.error(request, 'Invalid username or password.')

    return render(request, 'users/login.html')

def signup_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')

        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return redirect('signup')

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken.")
            return redirect('signup')

        user = User.objects.create_user(username=username, password=password)
        Profile.objects.create(user=user)

        messages.success(request, "Account created successfully! Please log in.")
        return redirect('login')

    return render(request, 'users/signup.html')
