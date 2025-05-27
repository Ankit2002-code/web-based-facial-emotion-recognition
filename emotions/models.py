from django.db import models
from django.utils.timezone import now
from django.contrib.auth.models import User

class EmotionResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emotion = models.CharField(max_length=100)
    confidence = models.FloatField()
    health_tip = models.TextField()
    image = models.ImageField(upload_to='uploads/')   # Ensure this uses MEDIA_ROOT
    detected_at = models.DateTimeField(default=now)

    def __str__(self):
        return f"{self.user.username}: {self.emotion} - {self.detected_at}"
