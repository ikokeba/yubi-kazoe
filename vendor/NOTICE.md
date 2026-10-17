# 同梱しているもの

アプリが外部と通信しないよう、読み取りのプログラム・モデル・フォントをこのフォルダから配信している。

| フォルダ | 中身 | 入手元 | ライセンス |
| --- | --- | --- | --- |
| `tasks-vision/` | MediaPipe Tasks Vision 0.10.14（JS と wasm） | npm `@mediapipe/tasks-vision`（`tools/vendor.py`） | Apache License 2.0 |
| `models/` | hand_landmarker.task、pose_landmarker_lite.task（float16/1） | Google 公式の配布元 storage.googleapis.com/mediapipe-models（`.github/workflows/fetch-models.yml`） | Apache License 2.0 |
| `fonts/` | Zen Maru Gothic（500・700・900、使う文字のサブセットのみ） | npm `@fontsource/zen-maru-gothic`（`tools/vendor.py`） | SIL Open Font License 1.1 |
