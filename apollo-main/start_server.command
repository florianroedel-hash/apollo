#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Apollo local server on http://127.0.0.1:8000/ "
python3 -m http.server 8000
