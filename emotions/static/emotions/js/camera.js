document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const captureBtn = document.getElementById('capture-btn');
    const uploadForm = document.getElementById('upload-form');
    const imageUpload = document.getElementById('image-upload');
    const resultsDiv = document.getElementById('detection-results');
    
    // Result elements
    const resultImage = document.getElementById('result-image');
    const emotionElement = document.getElementById('detected-emotion');
    const confidenceBar = document.getElementById('detection-confidence');
    const healthTipElement = document.getElementById('detection-tip');

    let stream = null;

    // Start Camera
    startBtn.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 },
                    facingMode: 'user'
                } 
            });
            video.srcObject = stream;
            video.style.display = 'block';
            canvas.style.display = 'none';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            captureBtn.disabled = false;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access the camera. Please ensure you've granted camera permissions.");
        }
    });

    // Stop Camera
    stopBtn.addEventListener('click', function() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            video.style.display = 'none';
            startBtn.disabled = false;
            stopBtn.disabled = true;
            captureBtn.disabled = true;
        }
    });

    // Capture Frame
    captureBtn.addEventListener('click', function() {
        if (!stream) {
            alert('Please start the camera first!');
            return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(function(blob) {
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');
            analyzeImage(formData);
        }, 'image/jpeg', 0.9);
    });

    // Handle File Upload
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (imageUpload.files.length === 0) {
            alert('Please select an image first');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', imageUpload.files[0]);
        analyzeImage(formData);
    });

    // Analyze Image (common function for both camera and upload)
    function analyzeImage(formData) {
        // Show loading state
        document.getElementById('loader').style.display = 'block';
        
        fetch('/emotions/upload_image/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display results
            resultImage.src = data.image;
            emotionElement.textContent = data.emotion;
            confidenceBar.style.width = `${data.confidence_score}%`;
            confidenceBar.textContent = `${Math.round(data.confidence_score)}%`;
            healthTipElement.textContent = data.health_tip;
            
            // Show results div
            resultsDiv.style.display = 'block';
            
            // Update confidence bar color based on emotion
            updateConfidenceBarColor(data.emotion.toLowerCase());
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error processing image: ' + error.message);
        })
        .finally(() => {
            document.getElementById('loader').style.display = 'none';
        });
    }

    // Update confidence bar color based on emotion
    function updateConfidenceBarColor(emotion) {
        const colorMap = {
            'happy': 'bg-success',
            'sad': 'bg-info',
            'angry': 'bg-danger',
            'neutral': 'bg-secondary',
            'surprise': 'bg-warning',
            'fear': 'bg-dark',
            'disgust': 'bg-primary'
        };

        // Remove all color classes
        Object.values(colorMap).forEach(cls => {
            confidenceBar.classList.remove(cls);
        });

        // Add the appropriate class
        const colorClass = colorMap[emotion] || 'bg-primary';
        confidenceBar.classList.add(colorClass);
    }
});