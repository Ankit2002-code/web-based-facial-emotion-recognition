// 📌 Emotion Detection System - Camera and Image Upload Handling
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const captureBtn = document.getElementById('capture-btn');
const realTimeBtn = document.getElementById('real-time-btn');
const uploadForm = document.getElementById('upload-form');
const imageUpload = document.getElementById('image-upload');
const resultsDiv = document.getElementById('results');
const currentEmotionDisplay = document.getElementById('current-emotion');
const confidenceBar = document.getElementById('confidence-bar');

let stream = null;
let emotionInterval = null;

// 🚀 Start Camera
function startCamera() {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user' // Front camera by default
        } 
    })
    .then(s => {
        stream = s;
        video.srcObject = stream;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        captureBtn.disabled = false;
        video.style.display = 'block';
        
        if (realTimeBtn) realTimeBtn.disabled = false;
    })
    .catch(error => {
        console.error('Camera access error:', error);
        let errorMessage = 'Unable to access camera. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Please check your browser permissions and allow camera access.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera device found.';
        } else {
            errorMessage += 'Please try again or use image upload instead.';
        }
        
        showAlert(errorMessage, 'danger', 8000);
    });
}

// 🛑 Stop Camera
function stopCamera() {
    if (stream) {
        stopRealTimeTracking();
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        captureBtn.disabled = true;
        video.style.display = 'none';
        
        if (realTimeBtn) realTimeBtn.disabled = true;
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

    // Add timestamp to filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `emotion-capture-${timestamp}.jpg`;

    // Convert canvas to blob and send to server
    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('image', blob, filename);
        formData.append('calculate_stress', 'true');
        analyzeImage(formData);
    }, 'image/jpeg', 0.9);
}

// 🔄 Start Real-time Emotion Tracking
function startRealTimeTracking() {
    if (!video.srcObject) {
        showAlert('Please start the camera first!', 'warning');
        return;
    }

    // Initial capture
    captureFrame();
    
    // Then capture every 5 seconds
    emotionInterval = setInterval(() => {
        captureFrame();
    }, 5000);

    // Update UI
    realTimeBtn.textContent = 'Stop Real-time Analysis';
    realTimeBtn.classList.remove('btn-info');
    realTimeBtn.classList.add('btn-danger');
    captureBtn.disabled = true;
}

// ⏹️ Stop Real-time Emotion Tracking
function stopRealTimeTracking() {
    if (emotionInterval) {
        clearInterval(emotionInterval);
        emotionInterval = null;
    }
    
    // Update UI
    if (realTimeBtn) {
        realTimeBtn.textContent = 'Start Real-time Analysis';
        realTimeBtn.classList.remove('btn-danger');
        realTimeBtn.classList.add('btn-info');
        captureBtn.disabled = false;
    }
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
        
        // Convert confidence score to percentage if needed
        const confidenceScore = data.confidence_score <= 1 ? 
            Math.round(data.confidence_score * 100) : 
            Math.round(data.confidence_score);

        // Update live results display
        if (currentEmotionDisplay && confidenceBar) {
            currentEmotionDisplay.textContent = data.emotion;
            confidenceBar.style.width = `${confidenceScore}%`;
            confidenceBar.textContent = `${confidenceScore}% confidence`;
            updateConfidenceBarColor(data.emotion.toLowerCase());
        }

        // Show detailed results (unless in real-time mode)
        if (!emotionInterval) {
            displayResults({
                ...data,
                confidence_score: confidenceScore
            });
        }
        
        showAlert('Analysis completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to process image. Please try again.', 'danger');
    } finally {
        showLoading(false);
    }
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
                                        ${data.emotion} (${data.confidence_score}%)
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
                                            ${data.confidence_score}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            ${data.stress_level ? `
                            <tr>
                                <th>Stress Level</th>
                                <td>
                                    <span class="badge ${getStressLevelClass(data.stress_level)}">
                                        ${data.stress_level}
                                    </span>
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <th>Health Tip</th>
                                <td>${data.health_tip || 'No specific health tip available.'}</td>
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

// 🚦 Get stress level class
function getStressLevelClass(stressLevel) {
    const level = stressLevel.toLowerCase();
    if (level.includes('high')) return 'bg-danger';
    if (level.includes('medium')) return 'bg-warning';
    return 'bg-success';
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
    if (realTimeBtn) {
        realTimeBtn.disabled = show;
    }
}

// 💡 Show alert message
function showAlert(message, type, duration = 5000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${getAlertIcon(type)} me-2"></i>
            <div>${message}</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const alertsContainer = document.getElementById('alerts-container') || resultsDiv;
    alertsContainer.prepend(alertDiv);
    
    // Auto-dismiss after duration
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, duration);
}

function getAlertIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'danger': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// 🖼️ Handle file upload
imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const formData = new FormData();
        formData.append('image', e.target.files[0]);
        formData.append('calculate_stress', 'true');
        analyzeImage(formData);
    }
});

// 🏁 Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Dark mode toggle
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
    
    // Real-time analysis toggle
    if (realTimeBtn) {
        realTimeBtn.addEventListener('click', () => {
            if (emotionInterval) {
                stopRealTimeTracking();
            } else {
                startRealTimeTracking();
            }
        });
    }
    
    // Clean up when leaving page
    window.addEventListener('beforeunload', () => {
        stopRealTimeTracking();
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
});