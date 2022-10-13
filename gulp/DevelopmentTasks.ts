/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import { ITaskFunction } from "./GulpHelpers";

const license: ITaskFunction = (done: (err: Error) => void) => {
    // process all typescript files
    require("glob")(
        "{__mocks__,packages,__tests__,jenkins}{/**/*.js,/**/*.ts}",
        { "ignore": ['**/node_modules/**', '**/lib/**', '**/dist/**', '**/.build/**', '**/build/**', '**/gulp/**'] },
        (globErr: any, filePaths: string[]) => {
            if (globErr) {
                done(globErr);
                return;
            }
            // turn the license file into a multi line comment
            const desiredLineLength = 80;
            let alreadyContainedCopyright = 0;
            const header = "/*\n" + fs.readFileSync("LICENSE_HEADER").toString()
                .split(/\r?\n/g).map((line: string) => {
                    return ("* " + line).trim();
                })
                .join(require("os").EOL) + require("os").EOL + "*/" +
                require("os").EOL + require("os").EOL;
            try {
                for (const filePath of filePaths) {
                    const file = fs.readFileSync(filePath);
                    let result = file.toString();
                    const resultLines = result.split(/\r?\n/g);
                    if (resultLines.join().indexOf(header.split(/\r?\n/g).join()) >= 0) {
                        alreadyContainedCopyright++;
                        continue; // already has copyright
                    }
                    const shebangPattern = require("shebang-regex");
                    let usedShebang = "";
                    result = result.replace(shebangPattern, (fullMatch: string) => {
                        usedShebang = fullMatch + "\n"; // save the shebang that was used, if any
                        return "";
                    });
                    // remove any existing copyright
                    // Be very, very careful messing with this regex. Regex is wonderful.
                    result = result.replace(/\/\*[\s\S]*?(License|SPDX)[\s\S]*?\*\/[\s\n]*/i, "");
                    result = header + result; // add the new header
                    result = usedShebang + result; // add the shebang back
                    fs.writeFileSync(filePath, result);
                }
                console.log("Ensured that %d files had copyright information" +
                    " (%d already did).", filePaths.length, alreadyContainedCopyright);
            } catch (e) {
                done(e);
            }
            done(undefined);
        });
};
license.description = "Updates the license header in all TypeScript files";



const runChat: ITaskFunction = (done: (err: Error) => void) => {

    try {
        child_process.execSync(`which rsync`).toString()
    } catch (error) {
        console.log(error)
        console.log("Rsync not found on system, required for this gulp task to function. Please install rsync and try again.")
    }

    // ensure we're in root dir or backtrack there
    let projRoot = process.cwd() + path.sep
    const keyFile = "CONTRIBUTING.md" // File which only exists in project root
    while (!fs.existsSync(`${projRoot}${keyFile}`)) {

        projRoot = `${projRoot}..${path.sep}`

        if (path.resolve(projRoot) == path.resolve("/")) {
            console.log("Error trying to find project root - we're in the filesystem root.")
            console.log(`Make sure you are running from a dir under the project, and the file ${keyFile} exists in the project root.`)
            process.exit(1)
        }
    }

    let localRunDir = `${projRoot}/.build/`

    fs.mkdirpSync(`${localRunDir}/chatbot/configuration`)
    fs.mkdirpSync(`${localRunDir}/chatbot/chat`)
    fs.mkdirpSync(`${localRunDir}/chatbot/static`)
    fs.mkdirpSync(`${localRunDir}/chatbot/node_modules/@zowe/commonbot`)
    fs.mkdirpSync(`${localRunDir}/chatbot/plugins/@zowe/clicmd`)
    fs.mkdirpSync(`${localRunDir}/chatbot/plugins/@zowe/zos`)


    child_process.execSync(`rsync -r --ignore-existing packages/chat/resources/* ${localRunDir}/chatbot/configuration`)
    child_process.execSync(`rsync -r --ignore-existing packages/chat/resources/plugin.yaml ${localRunDir}/chatbot/plugins`)
    child_process.execSync(`rsync -r packages/chat/dist/* ${localRunDir}/chatbot/chat`)
    child_process.execSync(`rsync -r packages/zos/dist/* ${localRunDir}/chatbot/plugins/@zowe/zos`)
    child_process.execSync(`rsync -r packages/clicmd/dist/* ${localRunDir}/chatbot/plugins/@zowe/clicmd`)
    child_process.execSync(`rsync -r packages/chat-webapp/build/* ${localRunDir}/chatbot/static`)

    // child_process.execSync(`rsync -r packages/commonbot/dist/* ${localRunDir}/chatbot/node_modules/@zowe/commonbot`)
    try {

        child_process.execSync(`node chatbot/chat/main.js`, {
            cwd: `${localRunDir}`,
            stdio: [process.stdout, process.stderr],
            env: {
                ...process.env,
                PATH: process.env.PATH,
                ZOWE_CHAT_CONFIG_DIR: `${localRunDir}/chatbot/configuration`,
                NODE_ENV: `development`,
                ZOWE_CHAT_PLUGINS_DIR: `${localRunDir}/chatbot/plugins`,
                NODE_PATH: `${projRoot}/packages/chat/node_modules`,
                ZOWE_CHAT_STATIC_DIR: `${localRunDir}/chatbot/static`
            }
        })
    }
    catch (error) {
        console.log(error)
        //      console.log(error.stdout.toString())
        //    console.log(error.stderr.toString())

    }
    done(undefined)

}

runChat.description = "Sets up a local environment for running Zowe ChatBot. First time start will have empty configuration; future runs will not replace it."

exports.license = license;
exports.runChat = runChat;