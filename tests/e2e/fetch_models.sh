#!/bin/sh
# 通しテスト用に、MediaPipe の本体とモデルを手元に用意する（本番は Google の配布元から読み込む）。
# モデルは Google 公式と同じ構成のファイルを、それを同梱している npm パッケージから取り出す。
set -e
cd "$(dirname "$0")"
mkdir -p models && cd models
[ -d node_modules/@mediapipe/tasks-vision ] || npm i --silent --no-save @mediapipe/tasks-vision@0.10.14 playwright-core@1.64.1
if [ ! -f hand_landmarker.task ]; then
  f=$(npm pack --silent expo-vision-camera-v4-mediapipe@1.4.0); tar xzf "$f" package/hand_landmarker.task; mv package/hand_landmarker.task .; rm -rf package "$f"
fi
if [ ! -f pose_landmarker_lite.task ]; then
  f=$(npm pack --silent pose-landmarker-react-native); tar xzf "$f" package/android/src/main/assets/models/pose_landmarker_lite.task
  mv package/android/src/main/assets/models/pose_landmarker_lite.task .; rm -rf package "$f"
fi
ls -la *.task
