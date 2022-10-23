/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

const gulp = require('gulp');
const childProcess = require('child_process');
const fs = require('fs-extra')
const path = require('path');
const glob = require('glob');

// Updates the license header in all TypeScript files
async function updateLicenseTask() {
    // options is optional
    glob("{__mocks__,packages,__tests__,jenkins}{/**/*.js,/**/*.ts,/**/*.tsx}",
        {"ignore": ['**/node_modules/**', '**/lib/**', '**/dist/**', '**/.build/**', '**/build/**', '**/gulp/**']},
        function (error, filePaths) {
            if (error) {
                console.log(error);
                return;
            }

            // turn the license file into a multi line comment
            const desiredLineLength = 80;
            let alreadyContainedCopyright = 0;
            const header = "/*\n" + fs.readFileSync("LICENSE_HEADER").toString()
                .split(/\r?\n/g).map((line) => {
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
                    result = result.replace(shebangPattern, (fullMatch) => {
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
                console.error(e);
            }
        }
    );
}

// Sets up a local environment for running Zowe ChatBot. First time start will have empty configuration; future runs will not replace it.
async function startLocalTask() {
    try {
        childProcess.execSync(`which rsync`).toString()
    } catch (error) {
        console.log(error)
        console.log("Rsync not found on system, required for this gulp task to function. Please install rsync and try again.")
    }

    // Get local run folders
    let localRunDir = `${__dirname}/.build/`
    const zoweChatHome = `${localRunDir}/zoweChat`;
    const zoweChatPluginHome = `${localRunDir}/zoweChatPlugin`

    // Create all folders for local run
    console.log('');
    console.log('=======================');
    console.log('Create local running folder ...');
    console.log('=======================');
    fs.mkdirpSync(`${zoweChatHome}`)
    fs.mkdirpSync(`${zoweChatHome}/webapp`)
    fs.mkdirpSync(`${zoweChatPluginHome}/@zowe/clicmd`)
    fs.mkdirpSync(`${zoweChatPluginHome}/@zowe/zos`)

    // Synchronize @zowe/chat
    console.log('=======================');
    console.log('Synchronizing @zowe/chat ...');
    console.log('=======================');
    childProcess.execSync(`rsync -r --exclude '${zoweChatHome}/config' packages/chat/dist/* ${zoweChatHome}/zoweChat`)
    childProcess.execSync(`rsync -r --ignore-existing packages/chat/dist/config/* ${zoweChatHome}/zoweChat/config`)
    childProcess.execSync(`rsync -r --ignore-existing packages/chat/config/plugin.yaml ${zoweChatPluginHome}`)

    // Synchronize @zowe/bot
    // console.log('');
    // console.log('=======================');
    // console.log('Synchronizing @zowe/commonbot ...');
    // console.log('=======================');

    // Synchronize @zowe/webapp
    console.log('');
    console.log('=======================');
    console.log('Synchronizing @zowe/webapp ...');
    console.log('=======================');
    childProcess.execSync(`rsync -r packages/webapp/build/* ${zoweChatHome}/webapp`)

    // Synchronize @zowe/zos
    console.log('');
    console.log('=======================');
    console.log('Synchronizing @zowe/zos ...');
    console.log('=======================');
    childProcess.execSync(`rsync -r packages/zos/dist/* ${zoweChatPluginHome}/@zowe/zos`)

    // Synchronize @zowe/clicmd
    console.log('');
    console.log('=======================');
    console.log('Synchronizing @zowe/clicmd ...');
    console.log('=======================');
    childProcess.execSync(`rsync -r packages/clicmd/dist/* ${zoweChatPluginHome}/clicmd`)

    process.exit(1);
    
    // Configure zowe chat
    console.log('');
    console.log('=======================');
    console.log('Configuring Zowe Chat ...');
    console.log('=======================');
    console.log('Installing @zowe/bot library ...');
    childProcess.execSync(`cd ${zoweChatHome} && npm uninstall @zowe/commonbot && npm install ./lib/*`, { stdio: 'inherit' });
    console.log('');
    console.log('Creating global symlink for i18next package ...');
    childProcess.execSync(`cd ${zoweChatHome}/node_modules/i18next && npm unlink && npm link`, { stdio: 'inherit' });
    console.log('');
    console.log('Link-installing @zowe/chat and i18next for @zowe/clicmd plugin ...');
    childProcess.execSync(`cd ${zoweChatPluginHome}/@zowe/clicmd && npm link ${zoweChatHome} && npm link i18next`, { stdio: 'inherit' });
    console.log('');
    console.log('Link-installing @zowe/chat and i18next for @zowe/zos plugin ...');
    childProcess.execSync(`cd ${zoweChatPluginHome}/@zowe/zos && npm link ${zoweChatHome} && npm link i18next`, { stdio: 'inherit' });

    try {

        childProcess.execSync(`cd ${zoweChatHome} && node main.js`, {
            cwd: `${localRunDir}`,
            stdio: [process.stdout, process.stderr],
            env: {
                ...process.env,
                PATH: process.env.PATH,
                NODE_ENV: `development`,
                ZOWE_CHAT_HOME: `${zoweChatHome}`,
                ZOWE_CHAT_PLUGIN_HOME: `${zoweChatPluginHome}`,
            }
        })
    }
    catch (error) {
        console.log(error)
    }
}


exports.updateLicense = updateLicenseTask;
exports.startLocal = startLocalTask;
