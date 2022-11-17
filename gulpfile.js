/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

const childProcess = require('child_process');
const fs = require('fs-extra');
const glob = require('glob');
const moment = require('moment');
const semver = require('semver');

// Updates the license header in all TypeScript files
async function updateLicenseTask() {
    // options is optional
    glob(
        '{__mocks__,packages,__tests__,jenkins}{/**/*.js,/**/*.ts,/**/*.tsx}',
        {ignore: ['**/node_modules/**', '**/lib/**', '**/dist/**', '**/build/**', '**/release/**']},
        (error, filePaths) => {
            if (error) {
                console.log(error);
                return;
            }

            // turn the license file into a multi line comment
            let alreadyContainedCopyright = 0;
            const header =
                '/*\n' +
                fs
                    .readFileSync('LICENSE_HEADER')
                    .toString()
                    .split(/\r?\n/g)
                    .map(line => {
                        return ' ' + ('* ' + line).trim();
                    })
                    .join(require('os').EOL) +
                require('os').EOL +
                ' */' +
                require('os').EOL +
                require('os').EOL;
            try {
                for (const filePath of filePaths) {
                    const file = fs.readFileSync(filePath);
                    let result = file.toString();
                    const resultLines = result.split(/\r?\n/g);
                    if (resultLines.join().indexOf(header.split(/\r?\n/g).join()) >= 0) {
                        alreadyContainedCopyright++;
                        continue; // already has copyright
                    }
                    const shebangPattern = require('shebang-regex');
                    let usedShebang = '';
                    result = result.replace(shebangPattern, fullMatch => {
                        usedShebang = fullMatch + '\n'; // save the shebang that was used, if any
                        return '';
                    });
                    // remove any existing copyright
                    // Be very, very careful messing with this regex. Regex is wonderful.
                    result = result.replace(/\/\*[\s\S]*?(License|SPDX)[\s\S]*?\*\/[\s\n]*/i, '');
                    result = header + result; // add the new header
                    result = usedShebang + result; // add the shebang back
                    fs.writeFileSync(filePath, result);
                }
                console.log(
                    'Ensured that %d files had copyright information' + ' (%d already did).',
                    filePaths.length,
                    alreadyContainedCopyright,
                );
            } catch (e) {
                console.error(e);
            }
        },
    );

    await Promise.resolve('Task execution is finished!');
}

// Sets up a local environment for running Zowe ChatBot. First time start will have empty configuration; future runs will not replace it.
async function startLocalTask() {
    try {
        childProcess.execSync('which rsync').toString();
    } catch (error) {
        console.log(error);
        console.log(
            'Rsync not found on system, required for this gulp task to function. Please install rsync and try again.',
        );
    }

    // Get project root
    const projectRoot = __dirname;

    // Get local run folders
    const localRunDir = `${projectRoot}/.build`;
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
    childProcess.execSync(`rsync -r --exclude 'config' ${projectRoot}/packages/chat/dist/* ${zoweChatHome}`, {
        stdio: 'inherit',
    });
    childProcess.execSync(
        `rsync -r --ignore-existing ${projectRoot}/packages/chat/dist/config/* ${zoweChatHome}/config`,
        {stdio: 'inherit'},
    );
    childProcess.execSync(
        `rsync -r --ignore-existing ${projectRoot}/packages/chat/dist/config/plugin.yaml ${zoweChatPluginHome}`,
        {stdio: 'inherit'},
    );
    console.log('Done!');

    // Synchronize @zowe/webapp
    console.log('Synchronizing @zowe/webapp ...');
    childProcess.execSync(`rsync -r ${projectRoot}/packages/webapp/build/* ${zoweChatHome}/webapp`, {stdio: 'inherit'});
    console.log('Done!');

    // Synchronize @zowe/zos
    console.log('Synchronizing @zowe/zos ...');
    childProcess.execSync(`rsync -r ${projectRoot}/packages/zos/dist/* ${zoweChatPluginHome}/@zowe/zos`, {
        stdio: 'inherit',
    });
    console.log('Done!');

    // Synchronize @zowe/clicmd
    console.log('Synchronizing @zowe/clicmd ...');
    childProcess.execSync(`rsync -r ${projectRoot}/packages/clicmd/dist/* ${zoweChatPluginHome}/@zowe/clicmd`, {
        stdio: 'inherit',
    });
    console.log('Done!');

    // Configure zowe chat
    console.log('');
    console.log('Configuring Zowe Chat ...');
    console.log('Installing @zowe/bot library ...');
    childProcess.execSync(`cd ${zoweChatHome} && npm uninstall @zowe/bot && npm install ./lib/*`, {stdio: 'inherit'});
    console.log('Done!');
    console.log('Creating global symlink for i18next package ...');
    childProcess.execSync(`cd ${zoweChatHome}/node_modules/i18next && npm link`, {stdio: 'inherit'});
    console.log('Done!');
    console.log('Link-installing @zowe/chat and i18next for @zowe/clicmd plugin ...');
    childProcess.execSync(
        `cd ${zoweChatPluginHome}/@zowe/clicmd && npm link ${zoweChatHome} && npm uninstall i18next && npm link i18next`,
        {stdio: 'inherit'},
    );
    console.log('Done!');
    console.log('Link-installing @zowe/chat and i18next for @zowe/zos plugin ...');
    childProcess.execSync(
        `cd ${zoweChatPluginHome}/@zowe/zos && npm link ${zoweChatHome} && npm uninstall i18next && npm link i18next`,
        {stdio: 'inherit'},
    );
    console.log('Done!');
    console.log('All done!');

    try {
        childProcess.execSync(`cd ${zoweChatHome} && node main.js`, {
            cwd: `${localRunDir}`,
            stdio: [process.stdout, process.stderr],
            env: {
                ...process.env,
                PATH: process.env.PATH,
                NODE_ENV: 'development',
                ZOWE_CHAT_HOME: `${zoweChatHome}`,
                ZOWE_CHAT_PLUGIN_HOME: `${zoweChatPluginHome}`,
            },
        });
    } catch (error) {
        console.log(error);
    }

    await Promise.resolve('Task execution is finished!');
}

// Build all workspace
async function packagingTask() {
    try {
        // Get packaging time
        const packagingTime = moment().format('YYYYMMDD-HHmmss');

        // Print and check configuration
        console.log('');
        console.log('Packaging Zowe Chat and plugins release with settings below:');
        console.log('###################################################');
        console.log(`           NODE_ENV = ${process.env.NODE_ENV}`);
        console.log(`       RELEASE_TYPE = ${process.env.RELEASE_TYPE}`);
        console.log(`    RELEASE_VERSION = ${process.env.RELEASE_VERSION}`);
        console.log('###################################################');
        console.log('');
        console.log(`Release folder: ${__dirname}/release`);
        console.log(`Packaging time: ${packagingTime}`);
        if (process.env.NODE_ENV === undefined || process.env.NODE_ENV.toLowerCase() !== 'production') {
            // production, fvt, ut, development
            console.log('The value of environment variable NODE_ENV is not production!');
            console.log('Check and set the value to production first please!');
            return;
        }
        if (
            process.env.RELEASE_TYPE === undefined ||
            ['beta', 'ga'].includes(process.env.RELEASE_TYPE.toLowerCase()) === false
        ) {
            // beta, ga
            console.log('The value of environment variable RELEASE_TYPE is not beta or ga!');
            console.log('Check and set the value to beta or ga first please!');
            return;
        }
        if (process.env.RELEASE_VERSION === undefined || semver.valid(process.env.RELEASE_VERSION) === false) {
            // semver: x.y.z
            console.log('The value of environment variable RELEASE_VERSION is empty or invalid!');
            console.log('Check and set the value correctly first please!');
            return;
        }

        // Get release file name
        let packageFileName = '';
        if (process.env.RELEASE_TYPE.toLowerCase() === 'beta') {
            packageFileName = `zowe-chat-v${process.env.RELEASE_VERSION.replace(/\./g, '')}-beta.tar.gz`;
        } else {
            packageFileName = `zowe-chat-v${process.env.RELEASE_VERSION.replace(/\./g, '')}.tar.gz`;
        }

        // Get project root
        const projectRoot = __dirname;

        // Get release folder
        const releaseDir = `${projectRoot}/release`;
        const zoweChatReleaseDir = `${releaseDir}/zoweChat`;
        const pluginReleaseDir = `${releaseDir}/plugins`;

        // Build all
        console.log('');
        console.log('===================================================');
        console.log('  Step 1: Building all ...');
        console.log('===================================================');
        childProcess.execSync('npm run buildAll', {stdio: 'inherit'});
        console.log('Done!');

        // Create all folders for packaging
        console.log('');
        console.log('===================================================');
        console.log('  Step 2: Cleaning or creating release folders ...');
        console.log('===================================================');
        fs.mkdirpSync(`${releaseDir}`);
        childProcess.execSync(`rm -rf ${releaseDir}/*`, {stdio: 'inherit'});
        fs.mkdirpSync(`${zoweChatReleaseDir}/webapp`);
        fs.mkdirpSync(`${pluginReleaseDir}/@zowe/clicmd`);
        fs.mkdirpSync(`${pluginReleaseDir}/@zowe/zos`);
        console.log('Done!');

        // Copy the latest build result
        console.log('');
        console.log('===================================================');
        console.log('  Step 3: Copying the latest build result ...');
        console.log('===================================================');
        console.log('Copying @zowe/chat ...');
        childProcess.execSync(`cp -R ${projectRoot}/packages/chat/dist/* ${zoweChatReleaseDir}`, {stdio: 'inherit'});
        childProcess.execSync(`cp ${projectRoot}/packages/chat/dist/config/plugin.yaml ${pluginReleaseDir}/.`, {
            stdio: 'inherit',
        });
        console.log('Done!');
        console.log('Copying @zowe/webapp ...');
        childProcess.execSync(`cp -R ${projectRoot}/packages/webapp/build/* ${zoweChatReleaseDir}/webapp/.`, {
            stdio: 'inherit',
        });
        console.log('Done!');
        console.log('Copying @zowe/zos ...');
        childProcess.execSync(`cp -R ${projectRoot}/packages/zos/dist/* ${pluginReleaseDir}/@zowe/zos/.`, {
            stdio: 'inherit',
        });
        console.log('Done!');
        console.log('Copying @zowe/clicmd ...');
        childProcess.execSync(`cp -R ${projectRoot}/packages/clicmd/dist/* ${pluginReleaseDir}/@zowe/clicmd/.`, {
            stdio: 'inherit',
        });
        console.log('Done!');

        // Install dependency
        console.log('');
        console.log('===================================================');
        console.log('  Step 4: Installing dependency ...');
        console.log('===================================================');
        console.log('Installing dependency for @zowe/chat ...');
        childProcess.execSync(`cd ${zoweChatReleaseDir} && npm install --production`, {stdio: 'inherit'});
        console.log('Done!');
        console.log('Installing dependency for @zowe/clicmd ...');
        childProcess.execSync(`cd ${pluginReleaseDir}/@zowe/clicmd && npm install --production`, {stdio: 'inherit'});
        console.log('Done!');
        console.log('Installing dependency for @zowe/zos ...');
        childProcess.execSync(`cd ${pluginReleaseDir}/@zowe/zos && npm install --production`, {stdio: 'inherit'});
        console.log('Done!');

        // Packaging
        console.log('');
        console.log('===================================================');
        console.log('  Step 5: Packaging Zowe Chat and plugins ...');
        console.log('===================================================');
        childProcess.execSync(`cd ${zoweChatReleaseDir}/.. && tar zcf ./${packageFileName} ./zoweChat ./plugins`, {
            stdio: 'inherit',
        });
        console.log(`Image file: ${releaseDir}/${packageFileName}`);
        console.log('Done!');

        // Generate SHA checksum
        console.log('');
        console.log('===================================================');
        console.log('  Step 6: Generating SHA checksum ...');
        console.log('===================================================');
        childProcess.execSync(`cd ${zoweChatReleaseDir}/.. && shasum -a 256 ${packageFileName} > checksum.sha256`, {
            stdio: 'inherit',
        });
        console.log(`Checksum file: ${releaseDir}/checksum.sha256`);
        console.log('Done!');

        console.log('All done!');
    } catch (error) {
        console.log(error);
        console.log(error.stack);
    } finally {
        await Promise.resolve('Task execution is finished!');
    }
}

exports.updateLicense = updateLicenseTask;
exports.startLocal = startLocalTask;
exports.packaging = packagingTask;
