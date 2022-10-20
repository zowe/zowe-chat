#!/bin/sh

. ./start.env

# Check Node exists
which node
if [[ $! == 1 ]]; then
    echo "Could not find a node.js installation. please update the start.env file with your node.js installation"
    exit 1
fi

export NODE_ENV='prod'
export ZOWE_CHAT_CONFIG_DIR='./config'
export ZOWE_CHAT_PLUGINS_DIR='./plugins'
export ZOWE_CHAT_STATIC_DIR='./web/static'
node lib/main.js
