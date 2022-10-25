#!/bin/sh -e
set -xe

################################################################################
# This program and the accompanying materials are made available under the terms of the
# Eclipse Public License v2.0 which accompanies this distribution, and is available at
# https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project.
################################################################################

# constants
SCRIPT_NAME=$(basename "$0")
SCRIPT_DIR=$(pwd)

# clean up content folder
echo "$SCRIPT_NAME cleaning up pax folder ..."
cd "$SCRIPT_DIR"
mv content bak && mkdir -p content

# unpack tar
cd $SCRIPT_DIR/bak
tar -xzvf zowe-chat-*.tar.gz

# move real files to the content folder
echo "$SCRIPT_NAME copying files should be in pax ..."
cd "$SCRIPT_DIR/content"
cp -R ../bak/zowe_chat/ .
cp ../ascii/bin/* bin/
