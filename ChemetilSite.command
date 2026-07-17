#!/bin/bash
cd "$(dirname "$0")"
source .env 2>/dev/null
python3 -m http.server 7810 &
SERVER=$!
sleep 1
open "http://localhost:7810"
wait $SERVER
