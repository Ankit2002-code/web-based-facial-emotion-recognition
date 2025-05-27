// 📌 Camera and Image Upload Handling
const video = document.getElementById('video'); // Changed from 'camera-feed'
const canvas = document.getElementById('canvas'); // Now using the visible canvas
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const captureBtn = document.getElementById('capture-btn');
const uploadForm = document.getElementById('upload-form');
const imageUpload = document.getElementById('image-upload');
const resultsDiv = document.getElementById('results');
const currentEmotionDisplay = document.getElementById('current-emotion');
const confidenceBar = document.getElementById('confidence-bar');

let stream = null;

// 🚀 Start Camera
function startCamera() {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user' // Front camera by default
        } 
    })
    .then(stream => {
        video.srcObject = stream;
        stream = stream; // Store the stream for later cleanup
        startBtn.disabled = true;
        stopBtn.disabled = false;
        captureBtn.disabled = false;
        video.style.display = 'block';
    })
    .catch(error => {
        console.error('Camera access error:', error);
        showAlert('Unable to access camera. Please check permissions.', 'danger');
    });
}

// 🛑 Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        captureBtn.disabled = true;
        video.style.display = 'none';
    }
}

// 📸 Capture Frame from Camera
function captureFrame() {
    if (!video.srcObject) {
        showAlert('Please start the camera first!', 'warning');
        return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and send to server
    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('image', blob, 'captured-frame.jpg');
        analyzeImage(formData);
    }, 'image/jpeg', 0.9);
}

// 🔥 Analyze Image (handles both uploads and camera captures)
async function analyzeImage(formData) {
    showLoading(true);
    
    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        const response = await fetch('/emotions/upload_image/', {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': csrfToken || '' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Update live results display
        if (currentEmotionDisplay && confidenceBar) {
            currentEmotionDisplay.textContent = data.emotion;
            confidenceBar.style.width = `${data.confidence_score}%`;
            confidenceBar.textContent = `${Math.round(data.confidence_score)}% confidence`;
            
            // Update confidence bar color based on emotion
            updateConfidenceBarColor(data.emotion.toLowerCase());
        }

        // Show detailed results
        displayResults(data);
        showAlert('Analysis completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to process image. Please try again.', 'danger');
    } finally {
        showLoading(false);
    }
}

// 🎨 Update confidence bar color based on emotion
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

// 📊 Display detailed results
function displayResults(data) {
    const resultsHtml = `
        <div class="card mt-3">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Analysis Results</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-5">
                        <img src="${data.image}" class="img-fluid rounded" alt="Analyzed Image">
                    </div>
                    <div class="col-md-7">
                        <table class="table table-bordered">
                            <tr>
                                <th>Emotion Detected</th>
                                <td>
                                    <span class="badge ${getEmotionBadgeClass(data.emotion)}">
                                        ${data.emotion}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <th>Confidence Level</th>
                                <td>
                                    <div class="progress" style="height: 25px;">
                                        <div class="progress-bar ${getConfidenceBarClass(data.confidence_score)}" 
                                             role="progressbar" style="width: ${data.confidence_score}%" 
                                             aria-valuenow="${data.confidence_score}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${Math.round(data.confidence_score)}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>Health Tip</th>
                                <td>${data.health_tip}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = resultsHtml;
    resultsDiv.style.display = 'block';
}

// 🏷️ Get emotion badge class
function getEmotionBadgeClass(emotion) {
    const emotionLower = emotion.toLowerCase();
    const classMap = {
        'happy': 'bg-success',
        'sad': 'bg-info',
        'angry': 'bg-danger',
        'neutral': 'bg-secondary',
        'surprise': 'bg-warning',
        'fear': 'bg-dark',
        'disgust': 'bg-primary'
    };
    return classMap[emotionLower] || 'bg-primary';
}

// 📈 Get confidence bar class
function getConfidenceBarClass(confidence) {
    if (confidence > 80) return 'bg-success';
    if (confidence > 60) return 'bg-info';
    if (confidence > 40) return 'bg-warning';
    return 'bg-danger';
}

// ⏳ Show loading state
function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
    if (captureBtn) {
        captureBtn.disabled = show;
    }
}

// 💡 Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const alertsContainer = document.getElementById('alerts-container') || resultsDiv;
    alertsContainer.prepend(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

// 🖼️ Handle file upload
imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const formData = new FormData();
        formData.append('image', e.target.files[0]);
        analyzeImage(formData);
    }
});


// 🏁 Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
        });
    }
    // Camera controls
    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (stopBtn) stopBtn.addEventListener('click', stopCamera);
    if (captureBtn) captureBtn.addEventListener('click', captureFrame);
    
    // Clean up camera stream when leaving page
    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
});