from django.db import models
from django.utils.timezone import now

class EmotionResult(models.Model):
    emotion = models.CharField(max_length=100)
    confidence = models.FloatField()
    health_tip = models.TextField()
    image = models.ImageField(upload_to='uploads/')   # Ensure this uses MEDIA_ROOT
    detected_at = models.DateTimeField(default=now)

    def __str__(self):
        return f"{self.emotion} - {self.detected_at}"
