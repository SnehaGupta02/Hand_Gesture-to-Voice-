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


const boxWidth = 100;
const boxHeight = 100;
const boxX = canvas.width - boxWidth - 20; 
const boxY = 10; 


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
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        }, 100);
    }
});


detectButton.addEventListener('click', async () => {
    
    const flippedBoxX = canvas.width - boxX - boxWidth; 
    const detectionArea = ctx.getImageData(flippedBoxX, boxY, boxWidth, boxHeight);
    const canvasBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const formData = new FormData();
    const img = new Image();
    img.src = URL.createObjectURL(canvasBlob);

    img.onload = async () => {
        const ctxResized = document.createElement('canvas').getContext('2d');
        ctxResized.canvas.width = 224;
        ctxResized.canvas.height = 224;
        ctxResized.drawImage(img, 0, 0, 224, 224);

        const resizedCanvasBlob = await new Promise(resolve => ctxResized.canvas.toBlob(resolve, 'image/png'));
        formData.append('image', resizedCanvasBlob, 'gesture_resized.png');

        try {
            
            const response = await fetch('http://127.0.0.1:5000/predict', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Prediction failed');

            const result = await response.json();
            detectedClass = result.class;

            if (detectedClass !== "Unknown" && detectedClass !== "No hands detected") {
                wordSequence += detectedClass;
                resultText.textContent = 'DETECTED TEXT:'+ wordSequence;
                speakButton.disabled = false;
            } else {
                resultText.textContent = 'No valid gesture detected';
            }
        } catch (error) {
            resultText.textContent = 'Error predicting gesture:'+ error.message;
        }
    };
});


retakeButton.addEventListener('click', () => {
    if (detectedClass) {
       
        wordSequence = wordSequence.slice(0, -detectedClass.length);
        resultText.textContent = 'DETECTED TEXT:'+ wordSequence; 
        detectedClass = '';
    }
});


speakButton.addEventListener('click', async () => {
    if (wordSequence) {
        try {
            const response = await fetch('http://127.0.0.1:5000/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'The detected sequence is' +wordSequence}),
            });

            if (response.ok) {
                const utterance = new SpeechSynthesisUtterance('The detected sequence is ${wordSequence}');
                utterance.rate = 0.6;
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