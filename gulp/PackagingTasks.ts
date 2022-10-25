import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as tar from "tar";
import { getProjectRoot, ITaskFunction } from "./GulpHelpers";

const packageChat: ITaskFunction = (done: (err: Error) => void) => {

    let projRoot = getProjectRoot();
    let tmpdir = fs.mkdtempSync(os.tmpdir() + path.sep + "zowechat-packaging-");
    let packageDir = `${tmpdir}${path.sep}zowe_chat`;

    try {
        let files = fs.readdirSync(`${tmpdir}`);
        for (let file of files) {
            fs.rmSync(`${packageDir}/${file}`, { recursive: true, force: true });
        }

    } finally {
        console.log(`Building the package in ${tmpdir}...`);
    }
    fs.mkdirpSync(`${packageDir}`);


    // Components
    fs.copySync(`${projRoot}/packages/commonbot/dist/`, `${packageDir}/lib/@zowe/commonbot`);
    fs.copySync(`${projRoot}/packages/chat/dist/`, `${packageDir}/lib`);
    fs.copySync(`${projRoot}/packages/chat-webapp/build/`, `${packageDir}/web/static`);

    // Configuration and startup files
    fs.copySync(`${projRoot}/packages/chat/resources/chatServer.yaml`, `${packageDir}/config/chatServer.yaml`);
    fs.copySync(`${projRoot}/packages/chat/resources/chatTools`, `${packageDir}/config/chatTools`);
    fs.copySync(`${projRoot}/bin/chat-setup.env`, `${packageDir}/chat-setup.env`);
    fs.copySync(`${projRoot}/bin/run-chat.sh`, `${packageDir}/bin/run-chat.sh`);
    fs.copySync(`${projRoot}/bin/ZWECHSTC.jcl`, `${packageDir}/bin/ZWECHSTC.jcl`);
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


    tar.c({
        gzip: true,
        file: `${projRoot}/.build/package/zowe-chat-${chatPkgJson.version}.tar.gz`,
        sync: true,
        cwd: tmpdir
    }, ["./"]);
    // child_process.execSync(`npm install --production`, { cwd: `${packageDir}/lib/@zowe/commonbot` });

    // Cleanup temporary dir
    fs.rmSync(tmpdir, {
        force: true,
        recursive: true
    });
    done(undefined);

};

exports.package = packageChat;