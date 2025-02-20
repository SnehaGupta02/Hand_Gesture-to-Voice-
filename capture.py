import os
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, Flatten, Dropout
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2

train_dir = '/home/prerna/Desktop/project/frontend/new_augmented/train'
val_dir = '/home/prerna/Desktop/project/frontend/new_augmented/val'

train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=10,
    width_shift_range=0.1,
    height_shift_range=0.1,
    brightness_range=[0.8, 1.2],
    zoom_range=0.1
)
val_datagen = ImageDataGenerator(rescale=1./255)

train_data = train_datagen.flow_from_directory(
    train_dir,
    target_size=(150, 150),
    batch_size=32,
    class_mode='categorical'
)
val_data = val_datagen.flow_from_directory(
    val_dir,
    target_size=(150, 150),
    batch_size=32,
    class_mode='categorical'
)

base_model = MobileNetV2(input_shape=(150, 150, 3), include_top=False, weights='imagenet')

x = Flatten()(base_model.output)
x = Dense(128, activation='relu', kernel_regularizer=l2(0.01))(x)
x = Dropout(0.5)(x)
output = Dense(train_data.num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=output)

model_path = '/home/prerna/Desktop/project/model/updated_sign_language_model.h5'
model.load_weights(model_path)

base_model.trainable = True
for layer in base_model.layers[:-50]:
    layer.trainable = False


model.compile(
    optimizer=Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Continue training the model
history = model.fit(
    train_data,
    validation_data=val_data,
    epochs=20,  # Adjust epochs based on performance
    batch_size=32
)

# Save the updated model
updated_model_path = '/home/prerna/Desktop/project/model/updated_sign_language_model.h5'
model.save(updated_model_path)

print(f"Updated model saved at {updated_model_path}")
