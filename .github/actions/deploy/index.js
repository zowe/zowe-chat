const core = require('@actions/core')
const ssh2 = require('ssh2');
const fs = require('fs')
const yaml = require('js-yaml')
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

let client = new ssh2.Client();

const chatHome = `${home}/chat`
const pkeyLoc = 'chat_pkey.id_rsa'
fs.writeFileSync(`${pkeyLoc}`, `${ssh_key}`)

const chatCfgYaml = yaml.load(fs.readFileSync('release/zoweChat/config/chatServer.yaml'))
const mmCfgYaml = yaml.load(fs.readFileSync('release/zoweChat/config/chatTools/mattermost.yaml'))

chatCfgYaml.webApp.hostName = host
chatCfgYaml.webApp.port = chat_port+1
chatCfgYaml.webapp.protocol = 'http'

mmCfgYaml.protocol = 'https'
mmCfgYaml.hostName = 'zowe-chat-dev-2.cloud.mattermost.com'
mmCfgYaml.teamUrl = 'zowe-chat-dev-2'
mmCfgYaml.botUserName = botName
mmCfgYaml.botAccessToken = botToken
mmCfgYaml.messagingApp.hostName = host
mmCfgYaml.messagingApp.protocol = 'http'
mmCfgYaml.messagingApp.port = chat_port

fs.writeFileSync(yaml.dump(chatCfgYaml), 'release/chatServer.yaml')
fs.writeFileSync(yaml.dump(mmCfgYaml), 'release/mattermost.yaml')

let lDeployCommands = [
    `scp -i ${pkeyLoc} release/zowe-chat-v002-beta.tar.gz ${ssh_user}@${host}:${home}/zowe-chat.tar.gz`
    `scp -i ${pkeyLoc} release/chatServer.yaml ${ssh_user}@${host}:${home}/chatServer.yaml`
    `scp -i ${pkeyLoc} release/mattermost.yaml ${ssh_user}@${host}:${home}/mattermost.yaml`
]

let rInstallCommands = [
    `cd ${home}`,
    `rm -rf ${chatHome}`,
    `mkdir -p ${chatHome}`,
    `mv ${home}/zowe-chat.tar.gz ${chatHome}`,
    `tar -xvf ${chatHome}/zowe-chat.tar.gz`,
    `cp -f ${home}/chatServer.yaml ${chatHome}/zoweChat/config`,
    `cp -f ${home}/mattermost.yaml ${chatHome}/zoweChat/config/chatTools`,

]

for (let cmd of lDeployCommands) {
    child_process.execSync(cmd, { stdout: 'inherit'} );
}


client.on('ready', () => {
    client.shell((err, stream) => {
        if (err) throw err;
        sh = stream;
        stream.on('close', () => {
            console.log("SSH Connection Closed.");
            client.end();
        })

        for (let cmd of rInstallCommands) {
            stream.write(cmd, (err) => {
                if (err != null) {
                    console.log("Error for command " + cmd)
                    console.log(error)
                }
            })
        }

        stream.on('data', (data) => {
            console.log(data);
        });
    })
}).connect({
    type: 'publickey',
    username:  ssh_user,
    key: ssh_key,
})

