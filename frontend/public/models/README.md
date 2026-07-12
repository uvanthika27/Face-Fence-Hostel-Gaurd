# face-api.js Model Weights

Place the following model files in this directory.
Download from: https://github.com/vladmandic/face-api/tree/master/model

Required files:
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1
- face_landmark_68_model-weights_manifest.json
- face_landmark_68_model-shard1
- face_recognition_model-weights_manifest.json
- face_recognition_model-shard1
- face_expression_model-weights_manifest.json
- face_expression_model-shard1

Quick download command (run from this folder):
  npx @vladmandic/face-api download --all --dest .

Or clone the model folder directly:
  git clone --depth=1 --filter=blob:none --sparse https://github.com/vladmandic/face-api
  cd face-api && git sparse-checkout set model
  cp model/* ../frontend/public/models/
