
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.models import User
from .models import Profile
from emotions.models import EmotionResult
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.auth.password_validation import validate_password
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
    
    # Get user's emotion results (filter by current user)
    emotion_results = EmotionResult.objects.filter(user=request.user).order_by('-detected_at')[:10]
    
    # Calculate statistics (for current user only)
    total_sessions = EmotionResult.objects.filter(user=request.user).count()
    
    # Get most common emotion (for current user)
    from django.db.models import Count
    most_common = EmotionResult.objects.filter(user=request.user).values('emotion').annotate(
        count=Count('emotion')
    ).order_by('-count').first()
    most_common_emotion = most_common['emotion'] if most_common else 'N/A'
    
    # Calculate average confidence (for current user)
    from django.db.models import Avg
    avg_confidence = EmotionResult.objects.filter(user=request.user).aggregate(
        avg_conf=Avg('confidence')
    )['avg_conf'] or 0
    
    # Calculate stress level based on negative emotions
    negative_emotions = ['angry', 'sad', 'fear', 'disgust']
    negative_percentage = 0
    
    if total_sessions > 0:
        negative_count = EmotionResult.objects.filter(
            user=request.user,
            emotion__in=negative_emotions
        ).count()
        negative_percentage = (negative_count / total_sessions) * 100
    
    # Determine stress level
    if negative_percentage < 20:
        stress_level = "Low"
    elif 20 <= negative_percentage < 60:
        stress_level = "Medium"
    else:
        stress_level = "High"
    
    # Get a random health tip
    daily_tip = random.choice(HEALTH_TIPS)
    
    # Prepare emotion data for chart (for current user)
    emotion_data = {}
    for result in EmotionResult.objects.filter(user=request.user):
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
        'stress_level': stress_level,
        'stress_percentage': round(negative_percentage, 1),
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
        email = request.POST.get('email', '')

        # Check if passwords match
        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return redirect('signup')

        # Validate password
        try:
            validate_password(password)
        except ValidationError as e:
            for error in e.messages:
                messages.error(request, error)
            return redirect('signup')

        # Validate email if provided
        if email:
            try:
                validate_email(email)
            except ValidationError:
                messages.error(request, "Please enter a valid email address.")
                return redirect('signup')

        # Check if username exists
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken.")
            return redirect('signup')

        # Check if email exists
        if email and User.objects.filter(email=email).exists():
            messages.error(request, "Email already in use.")
            return redirect('signup')

        try:
            # Create user
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email if email else ''
            )
            
            # Create profile
            Profile.objects.create(user=user)
            
            messages.success(request, "Account created successfully! Please log in.")
            return redirect('login')
            
        except Exception as e:
            messages.error(request, f"Error creating account: {str(e)}")
            return redirect('signup')

    return render(request, 'users/signup.html')