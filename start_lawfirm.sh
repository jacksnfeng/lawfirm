#!/bin/bash
cd /home/xiangru/lawfirm
pkill -f 'node server.js' 2>/dev/null
sleep 1
exec /usr/local/bin/node server.js >> /home/xiangru/lawfirm/server.log 2>&1
