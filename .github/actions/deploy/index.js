/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

// TODO: Replace all of this with a proper docker/k8s deployment

const core = require('@actions/core')
const ssh2 = require('ssh2');
const fs = require('fs')
const yaml = require('js-yaml')
const child_process = require('child_process')
/*
  host:

  ssh_port:

  chat_port:

  home:

  ssh_key:

  ssh_user:

    */

let host = core.getInput('host');
let home = "/user/zowechat";
let botName = core.getInput('botName');
let botToken = core.getInput('botToken');
let ssh_user = core.getInput('ssh_user');
let ssh_key = core.getInput('ssh_key');
let chat_port = core.getInput('chat_port')
let zosmf_protocol = core.getInput('zosmf_protocol')
let zosmf_host = core.getInput('zosmf_host')
let zosmf_port = core.getInput('zosmf_port')
let zosmf_ru = core.getInput('zosmf_ru')

let homeDir = process.env.HOME
console.log(homeDir)
try {
    fs.mkdirSync(`${homeDir}/.ssh`)
} catch(err) {
    console.log("Error creating local directory .build: " + err.toString())
}
fs.appendFileSync(`${homeDir}/.ssh/config`, 
`
Host ${host}
    Hostname ${host}
    StrictHostKeyChecking accept-new
`)

const chatHome = `${home}/chat`
try {
fs.mkdirSync('.build')
} catch(err) {
    console.log("Error creating local directory .build: " + err.toString())
}
const pkeyAuth = '.build/chat_pkey.id_rsa'
fs.writeFileSync(`${pkeyAuth}`, `${ssh_key.replaceAll('"','').replaceAll('\\n', '\n')}`, {mode: 0o600})

const chatCfgYaml = yaml.load(fs.readFileSync('release/zoweChat/config/chatServer.yaml'))
const mmCfgYaml = yaml.load(fs.readFileSync('release/zoweChat/config/chatTools/mattermost.yaml'))
const zosmfCfgYaml = yaml.load(fs.readFileSync('release/zoweChat/config/zosmfServer.yaml'))
chatCfgYaml.webApp.hostName = host
chatCfgYaml.webApp.port = Number(chat_port)+1
chatCfgYaml.webApp.protocol = 'http'
chatCfgYaml.log.consoleSilent = false

mmCfgYaml.protocol = 'https'
mmCfgYaml.hostName = 'zowe-chat-dev-2.cloud.mattermost.com'
mmCfgYaml.tlsCertificate = ""
mmCfgYaml.teamUrl = 'zowe-chat-dev-2'
mmCfgYaml.botUserName = botName
mmCfgYaml.botAccessToken = botToken
mmCfgYaml.messagingApp.hostName = host
mmCfgYaml.messagingApp.protocol = 'http'
mmCfgYaml.messagingApp.port = Number(chat_port)

let compZosmfRu;
if (zosmf_ru.trim() == 'false'){
    compZosmfRu = false
} else {
    compZosmfRu = Boolean(zosmf_ru)
}
zosmfCfgYaml.protocol = zosmf_protocol
zosmfCfgYaml.hostName = zosmf_host
zosmfCfgYaml.port = Number(zosmf_port)
zosmfCfgYaml.rejectUnauthorized = compZosmfRu

fs.writeFileSync( 'release/chatServer.yaml', yaml.dump(chatCfgYaml))
fs.writeFileSync( 'release/mattermost.yaml', yaml.dump(mmCfgYaml))
fs.writeFileSync( 'release/zosmfServer.yaml', yaml.dump(zosmfCfgYaml))

let lDeployCommands = [
    `scp -i ${pkeyAuth} release/zowe-chat-v002-beta.tar.gz ${ssh_user}@${host}:${home}/zowe-chat.tar.gz`,
    `scp -i ${pkeyAuth} release/chatServer.yaml ${ssh_user}@${host}:${home}/chatServer.yaml`,
    `scp -i ${pkeyAuth} release/mattermost.yaml ${ssh_user}@${host}:${home}/mattermost.yaml`,
    `scp -i ${pkeyAuth} release/zosmfServer.yaml ${ssh_user}@${host}:${home}/zosmfServer.yaml`
]

let rStopCommands = [
    `export ZOWE_CHAT_HOME=${chatHome}/zoweChat && 
    export ZOWE_CHAT_PLUGIN_HOME=${chatHome}/plugins && 
    export PATH=$PATH:/usr/local/lib/nodejs/node-v16.19.0-linux-s390x/bin && 
    ${chatHome}/zoweChat/bin/chatsvr_bash stop`,
]

let rInstallCommands = [
    `rm -rf ${chatHome}`,
    `mkdir -p ${chatHome}`,
    `cp -f ${home}/zowe-chat.tar.gz ${chatHome}`,
    `cd ${chatHome} && tar -xf zowe-chat.tar.gz`,
    `cp -f ${home}/chatServer.yaml ${chatHome}/zoweChat/config`,
    `cp -f ${home}/zosmfServer.yaml ${chatHome}/zoweChat/config`,
    `cp -f ${home}/mattermost.yaml ${chatHome}/zoweChat/config/chatTools`,
    `export PATH=$PATH:/usr/local/lib/nodejs/node-v16.19.0-linux-s390x/bin &&
     export ZOWE_CHAT_HOME=${chatHome}/zoweChat && 
     export ZOWE_CHAT_PLUGIN_HOME=${chatHome}/plugins && 
     cd $ZOWE_CHAT_HOME/node_modules/i18next && 
     npm link && 
     cd  $ZOWE_CHAT_PLUGIN_HOME && 
     npm link i18next && 
     cd  $ZOWE_CHAT_PLUGIN_HOME &&
     npm link $ZOWE_CHAT_HOME && 
     ${chatHome}/zoweChat/bin/chatsvr_bash start`,
]

for (let cmd of lDeployCommands) {
    console.log(cmd)
    child_process.execSync(cmd, { stdout: 'inherit'} );
}

let client = new ssh2.Client();

client.on('ready', async () => {
    console.log("auth successful")

    for (let cmd of rStopCommands) {
        let cmdComplete = new Promise((resolve) => {
            client.exec(cmd, (err, stream) => {
                if (err) {
                    console.log(err.toString())
                }
                // Ignore errors, the directory may not exist
                stream.on('close', (code, sig) => {
                    console.log('Command finished with code: ' + code + ', signal: ' + sig);
                    resolve(code)
                }).on('data', (data) => {
                        console.log(data.toString());
                    }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data.toString());
                    });
            })
        })
        await cmdComplete
    }

    for (let cmd of rInstallCommands) {
        let cmdComplete = new Promise((resolve) => {
            client.exec(cmd, (err, stream) => {
                if (err) {
                    console.log(err.toString())
                }
                stream.on('close', (code, sig) => {
                    console.log('Command finished with code: ' + code + ', signal: ' + sig);
                    resolve(code)
                }).on('data', (data) => {
                        console.log(data.toString());
                    }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data.toString());
                    });
            })
        })
        await cmdComplete
    }
    client.end()
}).connect({
    type: 'publickey',
    username:  ssh_user,
    privateKey: fs.readFileSync(pkeyAuth),
    host: host
})

