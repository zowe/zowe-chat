/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/


const core = require('@actions/core')
const superagent = require('superagent')
let apiKey = core.getInput('api_key');
let displayName = core.getInput('display_name');
let descr = core.getInput('description');
let botId = core.getInput('bot_id')
let botName = core.getInput('bot_name')

superagent.put(`https://zowe-chat-dev-2.cloud.mattermost.com/api/v4/bots/${botId}`)
        .send({ description: descr, display_name: displayName, username: botName})
        .set('Content-Type', 'application/json')
        .set('authorization', `Bearer ${apiKey}`)
        .then((resp) => {console.log(resp.statusCode)}).catch((err) => {console.error(err.toString()); return 1})