const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const disableWebcamButton = document.getElementById('disableWebcamButton');
const recordButton = document.getElementById('recordButton');
let localStream;
let mediaRecorder;
let recordedChunks = [];
let objectsDetected = [];

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
    disableWebcamButton.addEventListener('click', disableWebcam);
    recordButton.addEventListener('click', toggleRecording);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

function enableCam(event) {
    if (!model) {
        return;
    }

    event.target.classList.add('removed');

    const constraints = {
        video: true
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);

        localStream = stream;
    });
}

function disableWebcam() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());

        video.srcObject = null;
        video.style.display = 'none';
    }

    enableWebcamButton.disabled = false;
    enableWebcamButton.classList.remove('disabled');
    enableWebcamButton.style.opacity = 1;

    disableWebcamButton.disabled = true;
    disableWebcamButton.classList.add('disabled');
    disableWebcamButton.style.opacity = 0.5;

    stopRecording();
}

function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(video.srcObject);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// function handleDataAvailable(event) {
//     if (event.data.size > 0) {
//         recordedChunks.push(event.data);
//     }
//     if (mediaRecorder.state === 'inactive') {
//         downloadRecordedVideo();
//         saveDetectedObjectsToFile();
//     }
// }
function handleDataAvailable(event) {
    if (event.data.size > 0) {
        recordedChunks.push(event.data);
        drawRectanglesOnVideo(event.data); // Draw rectangles on recorded video frames
    }
    if (mediaRecorder.state === 'inactive') {
        downloadRecordedVideo();
        saveDetectedObjectsToFile(); // Save detected objects to text file when video is downloaded
    }
}

function drawRectanglesOnVideo(blob) {
    const videoElement = document.createElement('video');
    const reader = new FileReader();
    reader.onload = function() {
        videoElement.src = URL.createObjectURL(blob);
    }
    reader.readAsDataURL(blob);
    videoElement.onloadedmetadata = function() {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        for (let i = 0; i < objectsDetected.length; i++) {
            const obj = objectsDetected[i];
            ctx.beginPath();
            ctx.rect(obj.bbox[0], obj.bbox[1], obj.bbox[2], obj.bbox[3]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.stroke();
        }
        const modifiedBlob = canvas.toBlob(function(modifiedBlob) {
            recordedChunks.push(modifiedBlob);
        }, 'image/png');
    }
}

function downloadRecordedVideo() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = 'recorded_video.webm';
    a.click();
    window.URL.revokeObjectURL(url);
}

function saveDetectedObjectsToFile() {
    let textContent = 'Detected Objects:\n';
    objectsDetected.forEach((obj, index) => {
        textContent += `Object ${index + 1}: ${obj.class}\n`;
        textContent += `Bounding Box: (${obj.bbox[0]}, ${obj.bbox[1]}, ${obj.bbox[2]}, ${obj.bbox[3]})\n\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = 'detected_objects.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

var model = true;
demosSection.classList.remove('invisible');
var model = undefined;

cocoSsd.load().then(function (loadedModel) {
    model = loadedModel;
    demosSection.classList.remove('invisible');
});

var children = [];

function predictWebcam() {
    model.detect(video).then(function (predictions) {
        for (let i = 0; i < children.length; i++) {
            liveView.removeChild(children[i]);
        }
        children.splice(0);

        for (let n = 0; n < predictions.length; n++) {
            if (predictions[n].score > 0.66) {
                const p = document.createElement('p');
                p.innerText = predictions[n].class  + ' - with ' 
                    + Math.round(parseFloat(predictions[n].score) * 100) 
                    + '% confidence.';
                p.style = 'margin-left: ' + predictions[n].bbox[0] + 'px; margin-top: '
                    + (predictions[n].bbox[1] - 10) + 'px; width: ' 
                    + (predictions[n].bbox[2] - 10) + 'px; top: 0; left: 0;';

                const highlighter = document.createElement('div');
                highlighter.setAttribute('class', 'highlighter');
                highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px; top: '
                    + predictions[n].bbox[1] + 'px; width: ' 
                    + predictions[n].bbox[2] + 'px; height: '
                    + predictions[n].bbox[3] + 'px;';

                liveView.appendChild(highlighter);
                liveView.appendChild(p);
                children.push(highlighter);
                children.push(p);

                objectsDetected.push({
                    class: predictions[n].class,
                    bbox: predictions[n].bbox
                });
            }
        }

        window.requestAnimationFrame(predictWebcam);
    });
}
