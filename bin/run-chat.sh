#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project.

set -a
. ./chat.env
set +a

# Check Node exists
type node
if [ "$?" -ne "0" ]; then
    if [ -e "${NODE_HOME}/bin/node" ]; then
        echo "Node found in NODE_HOME"
    elif [ -e "${ZOWE_NODE_HOME}/bin/node" ]; then
        echo "Node found in NODE_HOME"
    else
        echo "Error: node not found, app-server cannot run"
        exit 1
    fi
fi

# Set node binary path, prioritize environment variables
if [ -n "$NODE_HOME" ]; then
    NODE_BIN=${NODE_HOME}/bin/node
    export PATH=${NODE_HOME}/bin:$PATH
elif [ -n "$ZOWE_NODE_HOME" ]; then
    NODE_BIN=${ZOWE_NODE_HOME}/bin/node
    export PATH=${ZOWE_NODE_HOME}/bin:$PATH
else
    NODE_BIN=node
fi

export NODE_BIN

# Test and set z/OS Specific environment variables
RUN_ON_ZOS=$(test $(uname) = "OS/390" && echo "true")
if [ "${RUN_ON_ZOS}" = "true" ]; then
    export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"
    export _BPXK_AUTOCVT=ON
    export __UNTAGGED_READ_MODE=V6

    nodeVersion="$(${NODE_BIN} --version)"
    nodeMajorVersion=$(echo ${nodeVersion} | cut -c2-3)
    if [ $nodeMajorVersion -ge "12" ]; then
        export _TAG_REDIR_ERR=txt
        export _TAG_REDIR_IN=txt
        export _TAG_REDIR_OUT=txt
    fi

fi

export NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH
export ZOWE_CHAT_CONSOLE_LOGFILE=log/console.log

echo Show Environment
env

# Begin Chat Server
{
    __UNTAGGED_READ_MODE=V6 _BPX_JOBNAME=ZWECHAT1 ${NODE_BIN} --harmony lib/main.js "$@" 2>&1
    echo "Ended with rc=$?"
} | tee $ZOWE_CHAT_CONSOLE_LOGFILE
