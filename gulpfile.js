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
const moment = require('moment');
const semver = require('semver')

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
        childProcess.execSync(`which rsync`).toString();
    } catch (error) {;
        console.log(error);
        console.log("Rsync not found on system, required for this gulp task to function. Please install rsync and try again.");
    }

    // Get project root
    const projRoot = __dirname;

    // Get local run folders
    let localRunDir = `${projRoot}/.build`;
    const zoweChatHome = `${localRunDir}/zoweChat`;
    const zoweChatPluginHome = `${localRunDir}/plugins`;

    // Create all folders for local run
    console.log('');
    console.log('Create local running folder ...');
    fs.mkdirpSync(`${zoweChatHome}`);
    fs.mkdirpSync(`${zoweChatHome}/webapp`);
    fs.mkdirpSync(`${zoweChatPluginHome}/@zowe/clicmd`);
    fs.mkdirpSync(`${zoweChatPluginHome}/@zowe/zos`);
    console.log('Done!');

    // Synchronize @zowe/chat
    console.log('');
    console.log('Synchronizing the latest build result ...');
    console.log('Synchronizing @zowe/chat ...');
    childProcess.execSync(`rsync -r --exclude 'config' ${projRoot}/packages/chat/dist/* ${zoweChatHome}`, { stdio: 'inherit' });
    childProcess.execSync(`rsync -r --ignore-existing ${projRoot}/packages/chat/dist/config/* ${zoweChatHome}/config`, { stdio: 'inherit' });
    childProcess.execSync(`rsync -r --ignore-existing ${projRoot}/packages/chat/dist/config/plugin.yaml ${zoweChatPluginHome}`, { stdio: 'inherit' });
    console.log('Done!');

    // Synchronize @zowe/bot
    console.log('Synchronizing @zowe/commonbot ...');
    childProcess.execSync(`rsync -r ${projRoot}/packages/commonbot/release/* ${zoweChatHome}/lib`, { stdio: 'inherit' });
    console.log('Done!'); 

    // Synchronize @zowe/webapp
    console.log('Synchronizing @zowe/webapp ...');
    childProcess.execSync(`rsync -r ${projRoot}/packages/webapp/build/* ${zoweChatHome}/webapp`, { stdio: 'inherit' });
    console.log('Done!');

    // Synchronize @zowe/zos
    console.log('Synchronizing @zowe/zos ...');
    childProcess.execSync(`rsync -r ${projRoot}/packages/zos/dist/* ${zoweChatPluginHome}/@zowe/zos`, { stdio: 'inherit' });
    console.log('Done!');

    // Synchronize @zowe/clicmd
    console.log('Synchronizing @zowe/clicmd ...');
    childProcess.execSync(`rsync -r ${projRoot}/packages/clicmd/dist/* ${zoweChatPluginHome}/@zowe/clicmd`, { stdio: 'inherit' });
    console.log('Done!');

    // Configure zowe chat
    console.log('');
    console.log('Configuring Zowe Chat ...');
    console.log('Installing @zowe/bot library ...');
    childProcess.execSync(`cd ${zoweChatHome} && npm uninstall @zowe/commonbot && npm install ./lib/*`, { stdio: 'inherit' });
    console.log('Done!');
    console.log('Creating global symlink for i18next package ...');
    childProcess.execSync(`cd ${zoweChatHome}/node_modules/i18next && npm link`, { stdio: 'inherit' });
    console.log('Done!');
    console.log('Link-installing @zowe/chat and i18next for @zowe/clicmd plugin ...');
    childProcess.execSync(`cd ${zoweChatPluginHome}/@zowe/clicmd && npm link ${zoweChatHome} && npm uninstall i18next && npm link i18next`, { stdio: 'inherit' });
    console.log('Done!');
    console.log('Link-installing @zowe/chat and i18next for @zowe/zos plugin ...');
    childProcess.execSync(`cd ${zoweChatPluginHome}/@zowe/zos && npm link ${zoweChatHome} && npm uninstall i18next && npm link i18next`, { stdio: 'inherit' });
    console.log('Done!');
    console.log('All done!');

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

// Build all workspace
async function buildTask() {
    childProcess.execSync(`npm run buildAll`, { stdio: 'inherit' });
}

// Build all workspace
async function cleanTask() {
    childProcess.execSync(`npm run buildAll`, { stdio: 'inherit' });
}

// Build all workspace
async function packagingTask() {
    // Get packaging time
    const packagingTime = moment().format(`YYYYMMDD-HHmmss`);

    // Print and check configuration
    console.log('');
    console.log('Building Zowe Chat release package with settings below:');
    console.log('###################################################');
    console.log(`           NODE_ENV = ${process.env.NODE_ENV}`);
    console.log(`       RELEASE_TYPE = ${process.env.RELEASE_TYPE}`);
    console.log(`    RELEASE_VERSION = ${process.env.RELEASE_VERSION}`);
    console.log('###################################################');
    console.log('');
    console.log(`Release folder: ${__dirname}/release`);
    console.log(`Packaging time: ${packagingTime}`);    // Specify packaging time
    if (process.env.NODE_ENV === undefined || process.env.NODE_ENV.toLowerCase() !== 'production') { // production, fvt, ut, development
        console.log(`The value of environment variable NODE_ENV is not production!`);
        console.log(`Check and set the value to production first please!`);
        process.exit(1);
    }
    if (process.env.RELEASE_TYPE === undefined || process.env.RELEASE_TYPE.toLowerCase() !== 'beta' || process.env.RELEASE_TYPE.toLowerCase() !== 'ga') { // beta, ga
        console.log(`The value of environment variable RELEASE_TYPE is not beta or ga!`);
        console.log(`Check and set the value to beta or ga first please!`);
        process.exit(2);
    }
    if (process.env.RELEASE_VERSION === undefined || semver.valid(process.env.RELEASE_VERSION) === false) { // semver: x.y.z
        console.log(`The value of environment variable RELEASE_VERSION is empty or invalid!`);
        console.log(`Check and set the value correctly first please!`);
        process.exit(3);
    }

    // Get release file name
    let packageFileName = '';
    if (releaseType.toLowerCase() === 'beta') {
        packageFileName = `zowe-chat-v${process.env.RELEASE_VERSION.replace(/\./g, '')}-beta.tar.gz`;
    } else {
        packageFileName = `zowe-chat-v${process.env.RELEASE_VERSION.replace(/\./g, '')}.tar.gz`;
    }

     // Get project root
     const projRoot = __dirname;

     // Get release folder
     const releaseDir = `${projRoot}/release`;
     const zoweChatReleaseDir = `${releaseDir}/zoweChat`;
     const pluginReleaseDir = `${releaseDir}/plugins`;
 
     // Create all folders for packaging
     console.log('');
     console.log('Create release folder ...');
     fs.mkdirpSync(`${releaseDir}`);
     fs.mkdirpSync(`${zoweChatReleaseDir}/webapp`);
     fs.mkdirpSync(`${pluginReleaseDir}/@zowe/clicmd`);
     fs.mkdirpSync(`${pluginReleaseDir}/@zowe/zos`);

     // Clean the release folder
     childProcess.execSync(`rm -rf ${releaseDir}/*`, { stdio: 'inherit' });

     // Copy the latest build result
    console.log('');
    console.log('Copying the latest build result ...');
    // Copy @zowe/chat
    console.log('Copying @zowe/chat ...');
    childProcess.execSync(`cp -R ${projRoot}/packages/chat/dist/* ${zoweChatReleaseDir}`, { stdio: 'inherit' });
    console.log('Done!');

    // Copy @zowe/bot
    console.log('Copying  @zowe/commonbot ...');
    childProcess.execSync(`cp -R ${projRoot}/packages/commonbot/release/* ${zoweChatReleaseDir}/lib`, { stdio: 'inherit' });
    console.log('Done!'); 

    // Copy @zowe/webapp
    console.log('Copying @zowe/webapp ...');
    childProcess.execSync(`cp -R ${projRoot}/packages/webapp/build/* ${zoweChatReleaseDir}/webapp`, { stdio: 'inherit' });
    console.log('Done!');

    // Copy @zowe/zos
    console.log('Copying @zowe/zos ...');
    childProcess.execSync(`cp -R ${projRoot}/packages/zos/dist/* ${pluginReleaseDir}/@zowe/zos`, { stdio: 'inherit' });
    console.log('Done!');

    // Copy @zowe/clicmd
    console.log('Copying @zowe/clicmd ...');
    childProcess.execSync(`cp -R ${projRoot}/packages/clicmd/dist/* ${pluginReleaseDir}/@zowe/clicmd`, { stdio: 'inherit' });
    console.log('Done!');
    

    console.log('All done!');
}

exports.updateLicense = updateLicenseTask;
exports.build = buildTask;
exports.startLocal = startLocalTask;
exports.packaging = gulp.series(buildTask, packagingTask);
