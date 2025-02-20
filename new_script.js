const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start');
const detectButton = document.getElementById('detect');
const stopButton = document.getElementById('stop');
const retakeButton = document.getElementById('retake');
const resultText = document.getElementById('result');
const speakButton = document.getElementById('speak');

let stream = null;
let detectionInterval = null;
let detectedClass = '';
let wordSequence = '';
let capturedFrames = [];
const boxWidth = 100;
const boxHeight = 100;
const boxX = canvas.width - boxWidth - 20; 
const boxY = 20; 


startButton.addEventListener('click', async () => {
    if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play();
        detectButton.disabled = false;
        stopButton.disabled = false;
        retakeButton.disabled = false;
        speakButton.disabled = true;

        detectionInterval = setInterval(() => {
            ctx.save();
            ctx.scale(-1, 1); 
            ctx.translate(-canvas.width, 0);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width - boxWidth - 20, 20, boxWidth, boxHeight); 
        }, 100);
    }
});

detectButton.addEventListener('click', async () => {
    const predictions = [];
    const captureDuration = 3000; 
    const frameInterval = 200; 
    const startTime = Date.now();

    while (Date.now() - startTime < captureDuration) {
        
        const flippedBoxX = canvas.width - boxWidth - 20;
        const detectionArea = ctx.getImageData(flippedBoxX, boxY, boxWidth, boxHeight);

        const roiCanvas = document.createElement('canvas');
        roiCanvas.width = boxWidth;
        roiCanvas.height = boxHeight;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.putImageData(detectionArea, 0, 0);

        const canvasBlob = await new Promise(resolve => roiCanvas.toBlob(resolve, 'image/png'));
        const formData = new FormData();
        formData.append('image', canvasBlob, 'gesture.png');

        try {
            const response = await fetch('http://127.0.0.1:5000/predict', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Prediction failed');

            const result = await response.json();
            if (result.class !== "Unknown") {
                predictions.push(result.class);
            }
        } catch (error) {
            console.error('Error predicting gesture:', error);
        }

       
        await new Promise(resolve => setTimeout(resolve, frameInterval));
    }

    if (predictions.length > 0) {
        const bestMatch = predictions.reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {});
        detectedClass = Object.keys(bestMatch).reduce((a, b) =>
            bestMatch[a] > bestMatch[b] ? a : b
        );

        wordSequence += " " + detectedClass;
        resultText.textContent = 'DETECTED TEXT: ' + wordSequence;
        speakButton.disabled = false;
    } else {
        resultText.textContent = 'No valid gesture detected';
    }
});

retakeButton.addEventListener('click', () => {
   
    detectedClass = '';
    wordSequence = '';
    resultText.textContent = 'DETECTED TEXT: ' + wordSequence;
    speakButton.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    startButton.disabled = false; 
});

speakButton.addEventListener('click', async () => {
    if (wordSequence) {
        try {
            const response = await fetch('http://127.0.0.1:5000/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: wordSequence }),
            });

            if (response.ok) {
                const utterance = new SpeechSynthesisUtterance(`The detected sequence is ${wordSequence}`);
                utterance.rate = 0.6;
                console.log('Speech rate:', utterance.rate);
                window.speechSynthesis.speak(utterance);
            } else {
                console.error('Error in speaking the detected text');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

stopButton.addEventListener('click', () => {
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        stream = null;

        video.srcObject = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        detectButton.disabled = true;
        stopButton.disabled = true;
        retakeButton.disabled = true;
        speakButton.disabled = true;
        resultText.textContent = "DETECTED TEXT:";
        wordSequence = "";
    }
});
