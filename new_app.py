from flask import Flask, request, jsonify
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from flask_cors import CORS
import pyttsx3
import os
from collections import Counter

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model('/home/prerna/Desktop/project/model/updated_sign_language_model.h5')

classes = ['Good Job', 'I', 'Am', 'are', 'Ok', 'you']
engine = pyttsx3.init()

@app.route('/predict', methods=['POST'])
def predict():
   
    try:
        file = request.files['image']
        img_array = np.frombuffer(file.stream.read(), np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        img_resized = cv2.resize(img, (150, 150))
        img_array = image.img_to_array(img_resized)
        img_array = np.expand_dims(img_array, axis=0) / 255.0

        predictions = model.predict(img_array)
        max_prob = np.max(predictions)
        print(f"Raw Predictions: {predictions}, Max Probability: {max_prob}")

        if max_prob < 0.5:
            predicted_class = "Unknown"
        else:
            predicted_class_idx = np.argmax(predictions, axis=1)
            predicted_class = classes[predicted_class_idx[0]]

        return jsonify({'class': predicted_class})

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500
        
       
@app.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.json
        text = data.get('text', '')
        if text:
            engine.setProperty('rate', 125)
            engine.say(text)
            engine.runAndWait()
            return jsonify({'status': 'success', 'message': f'Spoke: {text}'})
        else:
            return jsonify({'status': 'error', 'message': 'No text provided'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
