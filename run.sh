#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-8000}"
echo "[惜食惠] 启动中: http://127.0.0.1:${PORT}/index.html"
python3 -m http.server "$PORT" --bind 0.0.0.0
