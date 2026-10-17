#!/bin/sh
# 通しテストの準備：playwright-core を tests/e2e/node に入れる（モデルと MediaPipe は vendor/ を使う）
set -e
cd "$(dirname "$0")"
mkdir -p node && cd node
[ -d node_modules/playwright-core ] || npm i --silent --no-save playwright-core@1.64.1
