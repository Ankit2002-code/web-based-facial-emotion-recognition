
from django.urls import path
from . import views

urlpatterns = [
    path('detect/', views.emotion_detection_view, name='emotion_detection'),
    # path('start_camera/', views.start_camera, name='start_camera'),
    path('upload_image/', views.upload_image, name='upload_image'),
    path('save_result/', views.save_result_view, name='save_result'),
]