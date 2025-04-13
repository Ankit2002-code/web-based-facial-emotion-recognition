// 📌 Camera and Image Upload Handling
const video = document.getElementById('camera-feed');
const canvas = document.createElement('canvas');
const uploadForm = document.getElementById('upload-form');
const imageUploadInput = document.getElementById('image-upload');
const resultsDiv = document.getElementById('results');

// 🚀 Start Camera
function startCamera() {
    navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
    })
    .then(stream => {
        video.srcObject = stream;
        video.play();
    })
    .catch(error => {
        console.error('Camera access error:', error);
        alert('Unable to access camera. Please check permissions.');
    });
}

// 📸 Capture Frame from Camera
// emotions/script.js - captureFrame
function captureFrame() {
    if (!video.srcObject) {
        alert('Please start the camera first!');
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        if (blob) {
            const formData = new FormData();
            formData.append('image', blob, 'captured-frame.jpg');
            uploadImage(formData);  // Reuses the same uploadImage function
        }
    }, 'image/jpeg', 0.9);
}

// 🔥 Upload Image to Server
// emotions/script.js - uploadImage
async function uploadImage(formData) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

    try {
        const response = await fetch('/emotions/upload_image/', {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': csrfToken || '' }
        });

        if (response.ok) {
            const data = await response.json();
            // Update results div instead of redirecting
            document.getElementById('result-image').src = data.image;
            document.getElementById('emotion').textContent = data.emotion;
            document.getElementById('confidence').textContent = `${data.confidence_score.toFixed(2)}%`;
            document.getElementById('health-tip').textContent = data.health_tip;
            document.getElementById('results').style.display = 'block';
            
        } else {
            console.error('Upload failed:', await response.text());
            alert('Failed to upload image.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to process image.');
    }
}


// Handle File Upload - No changes needed here
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('image').files[0];
    if (!file) {
        alert('Please select an image to upload');
        return;
    }
    const formData = new FormData();
    formData.append('image', file);
    await uploadImage(formData);
});
// 🚀 Automatic Camera Start (Optional)
document.addEventListener('DOMContentLoaded', () => {
    const startCameraBtn = document.querySelector('button[onclick="startCamera()"]');
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', startCamera);
    }

    const captureFrameBtn = document.querySelector('button[onclick="captureFrame()"]');
    if (captureFrameBtn) {
        captureFrameBtn.addEventListener('click', captureFrame);
    }
});
