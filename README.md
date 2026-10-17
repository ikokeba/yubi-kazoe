# からだでまなぼう

カメラで手や体の形を読み取って遊ぶ、4〜6歳向けの知育ミニゲーム集です。カメラ映像は端末の中だけで処理し、送信も保存もしません。読み取りのプログラム・モデル・フォントも同梱していて、外部とは通信しません。

**遊ぶ：** https://ikokeba.github.io/yubi-kazoe/

| あそび | 内容 |
| --- | --- |
| ゆびで かぞえよう | りんごの数だけ指を立てる（1〜3、4〜5、6〜10は両手、たしざん） |
| からだ とけい | 腕を時計の針にして時刻を作る（12・3・6・9じ → 1〜12じ） |
| まねっこ かたち | おてほんと同じかたちを体で作る（ひこうき・ばんざい・ぼう・まる） |
| じゆうに かぞえよう | 指を立てた数だけりんごが出る（正解・不正解なし） |

## 構成

| 場所 | 中身 |
| --- | --- |
| `src/app.html` | 編集するソース（画面・判定・音のすべて） |
| `VERSION` | 版番号の正本 |
| `assets/voice/voice.json` | 指示音声（mp3 を base64 で格納） |
| `tools/build.py` | ソースに音声と版番号を差し込んで `index.html` を作る |
| `tools/gen_voice.py` | 指示音声の生成（Open JTalk + tohoku-f01） |
| `index.html`・`about.html` | 公開ファイル（GitHub Pages が main から配信）。手で編集しない |
| `src/about.html` | 「このアプリについて」のソース |
| `vendor/` | 同梱物（MediaPipe・モデル・フォント）。入手元とライセンスは `vendor/NOTICE.md` |
| `tools/vendor.py` | MediaPipe とフォントのサブセットを vendor/ に置く（文言を変えたら流し直す） |
| `release/itch/` | itch.io のページ用の文章・カバー・スクリーンショット |
| `tests/unit/` | 判定ロジックの単体テスト（push ごとに GitHub Actions で実行） |
| `tests/e2e/` | 偽のカメラ映像で通しテスト（数え方・画面遷移・4画面サイズの表示） |

## 開発の流れ

```sh
python3 tools/build.py          # 組み立て
npm test                        # 単体テスト
npm run e2e:setup && npm run e2e   # 通しテスト（外部通信ゼロ・保護者ゲート・4画面サイズも確認）
```

## クレジット

- 音声：Open JTalk、HTS voice tohoku-f01 © 東北大学 伊藤・能勢研究室（CC BY 4.0）
- 手と体の読み取り：MediaPipe Tasks Vision とモデル（Apache License 2.0）
- フォント：Zen Maru Gothic（SIL Open Font License 1.1）
- テスト画像：google-ai-edge/mediapipe-samples、tensorflow/tfjs-models のサンプル画像（Apache License 2.0）
- 効果音とBGMはアプリ内で合成
