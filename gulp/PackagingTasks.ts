import * as child_process from "child_process";
import * as fs from "fs-extra";
import { getProjectRoot, ITaskFunction } from "./GulpHelpers";

const packageChat: ITaskFunction = (done: (err: Error) => void) => {

    let projRoot = getProjectRoot();
    let packageDir = `/Users/ma648885/.dev/zowechat/testdeploy`;

    try {
        let files = fs.readdirSync(`${packageDir}`);
        for (let file of files) {
            fs.rmSync(`${packageDir}/${file}`, { recursive: true, force: true });
        }

    } finally {
        console.log(`Cleaned existing ${packageDir}`);
    }

    fs.mkdirpSync(`${packageDir}`);

    // Components
    fs.copySync(`${projRoot}/packages/commonbot/dist/package`, `${packageDir}/lib/@zowe/commonbot`);
    fs.copySync(`${projRoot}/packages/chat/dist/`, `${packageDir}/lib`);
    fs.copySync(`${projRoot}/packages/chat-webapp/build/`, `${packageDir}/web/static`);

    // Configuration and startup files
    fs.copySync(`${projRoot}/packages/chat/resources/chatServer.yaml`, `${packageDir}/config/chatServer.yaml`);
    fs.copySync(`${projRoot}/packages/chat/resources/chatTools`, `${packageDir}/config/chatTools`);
    fs.copySync(`${projRoot}/packages/chat/resources/start.env`, `${packageDir}/start.env`);
    fs.copySync(`${projRoot}/packages/chat/resources/start.sh`, `${packageDir}/start.sh`);
    fs.chmodSync(`${packageDir}/start.sh`, '0775');

    // Plugins
    fs.copySync(`${projRoot}/packages/zos/dist/`, `${packageDir}/plugins/@zowe/zos`);
    fs.copySync(`${projRoot}/packages/clicmd/dist/`, `${packageDir}/plugins/@zowe/clicmd`);
    fs.copySync(`${projRoot}/packages/chat/resources/plugin.yaml`, `${packageDir}/plugins/plugin.yaml`);

    // Use local @zowe/commonbot
    let chatPkgJson = fs.readJSONSync(`${packageDir}/lib/package.json`);
    chatPkgJson.dependencies["@zowe/commonbot"] = "file:./@zowe/commonbot";
    fs.writeFileSync(`${packageDir}/lib/package.json`, JSON.stringify(chatPkgJson));
    child_process.execSync(`npm install --production`, { cwd: `${packageDir}/lib` });


    // child_process.execSync(`npm install --production`, { cwd: `${packageDir}/lib/@zowe/commonbot` });

    done(undefined);

};

exports.package = packageChat;