const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const disableWebcamButton = document.getElementById('webcamButtonControll');

const recordButton = document.getElementById('recordButton');

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia);
  }
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it to call enableCam function which we will 
  // define in the next step.
  if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
  } else {
    console.warn('getUserMedia() is not supported by your browser');
  }
  
  // Placeholder function for next step. Paste over this in the next step.
 
  function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
      return;
    }
    
    // Hide the enable button once clicked.
    event.target.classList.add('removed');  
    
    // Show the disable webcam button.
    disableWebcamButton.style.display = 'inline-block';
    
    // Show the record button.
    recordButton.style.display = 'inline-block';
    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
      video: true
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);
    });
}

  // Placeholder function for next step.
function predictWebcam() {
}

// Pretend model has loaded so we can try out the webcam code.
var model = true;
demosSection.classList.remove('invisible');
// Store the resulting model in the global scope of our app.
var model = undefined;

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment 
// to get everything needed to run.
// Note: cocoSsd is an external object loaded from our index.html
// script tag import so ignore any warning in Glitch.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  // Show demo section now model is ready to use.
  demosSection.classList.remove('invisible');
});



var children = [];

function predictWebcam() {
  // Now let's start classifying a frame in the stream.
  model.detect(video).then(function (predictions) {
    // Remove any highlighting we did previous frame.
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);
    
    // Now lets loop through predictions and draw them to the live view if
    // they have a high confidence score.
    for (let n = 0; n < predictions.length; n++) {
      // If we are over 66% sure we are sure we classified it right, draw it!
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
      }
    }
    
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  });
}
disableWebcamButton.addEventListener('click', disableCam);

function disableCam() {
    window.location.reload();
}
let mediaRecorder;
let chunks = [];
let predictions; 

recordButton.addEventListener('click', toggleRecording);
function toggleRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        startRecording();
        recordButton.textContent = 'Stop Recording';
    } else {
        stopRecording();
        recordButton.textContent = 'Record';
    }
}

function startRecording() {
    chunks = [];
    mediaRecorder = new MediaRecorder(video.srcObject);
    mediaRecorder.ondataavailable = function(event) {
        chunks.push(event.data);
    };
    mediaRecorder.start();
    // Start tracking objects and saving their coordinates
    trackObjects();
}


function stopRecording() {
    // Stop tracking objects
    stopTrackingObjects();
    // Stop recording
    mediaRecorder.stop();
    mediaRecorder.onstop = function() {
        // Assemble recorded chunks into a Blob
        const blob = new Blob(chunks, { 'type' : 'video/webm' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'recorded-video.webm';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        // Download tracked objects data
        downloadTrackedObjectsData(predictions);
    };
}

function downloadTrackedObjectsData() {
    // Initialize a variable to store the tracked objects' data
    let trackedObjectsData = '';

    // Loop through the tracked objects' data and append it to the variable
    trackedObjectsData += 'Tracked Objects Data:\n';
    trackedObjectsData += 'Number of objects detected: ' + predictions.length + '\n';
    for (let i = 0; i < predictions.length; i++) {
        trackedObjectsData += 'Object ' + (i + 1) + ':\n';
        trackedObjectsData += 'Class: ' + predictions[i].class + '\n';
        trackedObjectsData += 'Score: ' + Math.round(parseFloat(predictions[i].score) * 100) + '%\n';
        trackedObjectsData += 'Bounding Box: ' + JSON.stringify(predictions[i].bbox) + '\n';
    }

    // Create a Blob containing the text data
    const textBlob = new Blob([trackedObjectsData], { type: 'text/plain' });

    // Create a URL for the Blob
    const textBlobUrl = window.URL.createObjectURL(textBlob);

    // Create an anchor element for downloading the text file
    const textFileLink = document.createElement('a');
    textFileLink.href = textBlobUrl;
    textFileLink.download = 'tracked-objects-data.txt';

    // Append the anchor element to the document body and simulate a click to trigger the download
    document.body.appendChild(textFileLink);
    textFileLink.click();

    // Clean up by removing the anchor element and revoking the URL
    document.body.removeChild(textFileLink);
    window.URL.revokeObjectURL(textBlobUrl);
}

function trackObjects() {
    // Start detecting and tracking objects in the webcam stream
    objectTracker = setInterval(function() {
        model.detect(video).then(function(data) {
            predictions = data; // Assign data to predictions variable
            // Save the number of objects identified and their coordinates
            // You can customize how you want to store this information
            console.log('Number of objects detected:', predictions.length);
            console.log('Object coordinates:', predictions);
            // You can further process or save this information as needed
        });
    }, 1000); // Adjust the interval as needed
}

function stopTrackingObjects() {
    // Stop object tracking
    clearInterval(objectTracker);
}

// Function to handle video upload and object detection
function handleVideoUpload(event) {
  const uploadedVideo = event.target.files[0];

  // Check if a video file is uploaded
  if (!uploadedVideo || uploadedVideo.type !== 'video/webm') {
    console.error('Please upload a valid webm video file');
    return;
  }

  // Create a URL for the uploaded video
  const videoURL = URL.createObjectURL(uploadedVideo);

  // Set the video source of the element to the uploaded video
  video.src = videoURL;

  // Load the uploaded video
  video.load();

  // Function to play the uploaded video and detect objects when loaded
  video.onloadeddata = function() {
    // Play the video
    video.play();

    // Start object detection on the uploaded video frames
    predictUploadedVideo();
  };
}

// Function to predict objects in uploaded video frames
// Add event listener to handle video upload
const uploadFileInput = document.getElementById('uploadVideo');
uploadFileInput.addEventListener('change', handleVideoUpload);

// Function to predict objects in uploaded video frames
function predictUploadedVideo() {
  if (!model) {
    return; // Ensure model is loaded before proceeding
  }

  // Function to call recursively for continuous detection in each frame
  const onVideoFrame = () => {
    if (video.paused || video.ended) return; // Stop when paused or ended

    model.detect(video)
      .then(predictions => {
        // Process and display predictions here (similar to predictWebcam)
        processPredictions(predictions);

        // Call this function again on the next frame
        window.requestAnimationFrame(onVideoFrame);
      });
  };

  // Start object detection on the uploaded video frames
  onVideoFrame();
}

// Function to process and display predictions
function processPredictions(predictions) {
  // Remove any previous object highlights
  removePreviousHighlights();

  // Loop through the predictions and draw bounding boxes
  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i];

    // Draw bounding box
    drawBoundingBox(prediction.bbox);

    // Display prediction info
    displayPredictionInfo(prediction.class, prediction.score, prediction.bbox);
  }
}

// Function to draw bounding box
function drawBoundingBox(bbox) {
  const highlighter = document.createElement('div');
  highlighter.setAttribute('class', 'highlighter');
  highlighter.style = 'left: ' + bbox[0] + 'px; top: ' + bbox[1] + 'px; width: ' + bbox[2] + 'px; height: ' + bbox[3] + 'px;';
  liveView.appendChild(highlighter);
  children.push(highlighter);
}

// Function to display prediction class and confidence score
function displayPredictionInfo(className, confidence, bbox) {
  const p = document.createElement('p');
  p.innerText = className + ' - with ' + Math.round(parseFloat(confidence) * 100) + '% confidence.';
  p.style = 'margin-left: ' + bbox[0] + 'px; margin-top: ' + (bbox[1] - 10) + 'px; width: ' + (bbox[2] - 10) + 'px; top: 0; left: 0;';
  liveView.appendChild(p);
  children.push(p);
}

// Function to remove previous object highlights
function removePreviousHighlights() {
  for (let i = 0; i < children.length; i++) {
    liveView.removeChild(children[i]);
  }
  children = [];
}