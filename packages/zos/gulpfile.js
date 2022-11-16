/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

// Description:
//   Gulp script used to clean, build, test (UT & FVT), deploy or packaging zosjob
//
// Usage:
//   gulp                         - same as 'gulp build'
//   gulp clean                   - Clean build folder ./dist
//   gulp build                   - Compile source code and save all results in the folder ./dist
//                                  Note: 1. Build folder ./dist will be cleaned automatically
//                                        2. Node modules will be updated according to package.json
//                                        3. Final build tar.gz file will be created automatically when the value of NODE_ENV is production, ut or fvt.
//   gulp packaging               - Packaging all files in the folder ./dist
//   gulp lint                    - Check the source code style in the folder ./src
//   gulp test                    - Run test cases in the folder ./test
//   gulp testUnit                - Run unit test cases in the folder ./test/ut
//   gulp testFunction            - Run functional test case in the folder ./test/fvt
// Environment Variables:
//   NODE_ENV                     - Indicate what kind of environment the gulp command is running in. Support value: production | ut | fvt | ...(dev)
//                                        = production : Build and package production package
//                                        = ut         : Build and package unit test package
//                                        = fvt        : Build and package function test package
//                                        = ...(dev)   : Build source code for development
//   RELEASE_TYPE                 - Indicate what kind of release will the package file be named: beta | ga | ...(dev)
//                                        = beta       : Beta is added to package file name: zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = production -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = ut         -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = fvt        -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = ...        -> zos-job-v${releaseVersion}.tar.gz
//                                        = ga         : Package file name: zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = production -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = ut         -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = fvt        -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = ...        -> zos-job-v${releaseVersion}.tar.gz
//                                        = ...(dev)   : Package file name: zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = production -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = ut         -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = fvt        -> zos-job-v${releaseVersion}.tar.gz
//                                                       NODE_ENV = ...        -> zos-job-v${releaseVersion}.tar.gz
//                                   Used in gulp build, gulp packaging task
//   RELEASE_VERSION               - Indicate which version will be add build file name
//                                   Used in gulp packaging task

const gulp = require('gulp');
const gulpClean = require('gulp-clean');
const gulpIf = require('gulp-if');
const gulpEslint = require('gulp-eslint');
const childProcess = require('child_process');
const fs = require('fs');
const moment = require('moment');
const gulpTypeScript = require('gulp-typescript');
const tsProject = gulpTypeScript.createProject('tsconfig.json');

// Specify node run-time environment: production, fvt, ut, development
let nodeEnv = 'development';
if (process.env.NODE_ENV !== undefined) {
    nodeEnv = process.env.NODE_ENV.toLowerCase();
}

// Define target release type of build file name
let releaseType = process.env.RELEASE_TYPE;
if (releaseType === undefined || releaseType.length === 0) {
    releaseType = 'daily';
}

// Define target build version for packaging
let releaseVersion = process.env.RELEASE_VERSION;
if (releaseVersion === undefined || releaseVersion.length === 0) {
    releaseVersion = '1.0.0';
}

// Specify build time
const buildTime = moment().format(`YYYYMMDD-HHmmss`);

// Get build folder of source and destination
const folder = {
    src: {
        source: '',
        destination: '',
    },
    test: {
        source: '',
        destination: '',
    },
};
if (nodeEnv === 'production') { // Product
    folder.src.source = ['src/**'];
    folder.src.destination = 'dist/';

    folder.test.source = 'N/A';
    folder.test.destination = 'N/A';
} else if (nodeEnv === 'fvt') { // FVT
    folder.src.source = ['src/**'];
    folder.src.destination = 'dist/src/';

    folder.test.source = 'test/fvt/**';
    folder.test.destination = 'dist/test/fvt/';
} else if (nodeEnv === 'ut') { // UT
    folder.src.source = ['src/**'];
    folder.src.destination = 'dist/src/';

    folder.test.source = 'test/ut/**';
    folder.test.destination = 'dist/test/ut/';
} else { // Development
    folder.src.source = ['src/**'];
    folder.src.destination = 'dist/';

    folder.test.source = 'N/A';
    folder.test.destination = 'N/A';
}

// Print the configuration
// console.log('');
console.log('Building @zowe/zos with settings below:');
console.log('###################################################');
console.log(`           NODE_ENV = ${nodeEnv}`);
console.log(`       RELEASE_TYPE = ${releaseType}`);
console.log(`    RELEASE_VERSION = ${releaseVersion}`);
console.log('###################################################');
console.log('');
console.log(`Build folder: ${JSON.stringify(folder, null, 2)}`);
console.log(`Build time: ${buildTime}`);

if (nodeEnv === undefined || nodeEnv.length === 0
    || releaseType === undefined || releaseType.length === 0
    || releaseVersion === undefined || releaseVersion.length === 0) {
    console.log('');
    console.log(`The value of some required building system environment variables is empty!`);
    console.log(`Check and set them first please!`);
    process.exit(1);
}

// Clean dist folder
function cleanTask() {
    return gulp.src('dist', {read: false, allowEmpty: true}).pipe(gulpClean());
}

// Check code style
function lintTask() {
    return gulp.src('src/**').pipe(gulp.src('test/**'))
            .pipe(gulpIf(isTypeScript, gulpEslint(), gulpIf(isJavaScript, gulpEslint())))
            .pipe(gulpEslint.format())
            .pipe(gulpEslint.failAfterError());
}

// Check whether target source is JS
function isJavaScript(file) {
    if (file.extname === '.js' && file.path.indexOf('node_modules') === -1) {
        return true;
    } else {
        return false;
    }
}

// Check whether target source is TypeScript
function isTypeScript(file) {
    if (file.extname === '.ts' && file.path.indexOf('node_modules') === -1) {
        return true;
    } else {
        return false;
    }
}

// Build source code task
function buildSourceTask() {
    return gulp.src(folder.src.source, {dot: true})
            .pipe(gulpIf(isTypeScript, tsProject()))
            .pipe(gulp.dest(folder.src.destination));
}

// Build test case task
function buildTestCaseTask() {
    return gulp.src(folder.test.source)
            .pipe(gulp.dest(folder.test.destination));
}

// Create package.json file
async function createPackageJsonTask() {
    // Read package.json
    const pkgJson = require('./package.json');

    // Copy
    const result = {...pkgJson};

    // Change product version
    result.version = releaseVersion;

    // Remove items for development
    delete result.scripts.build;
    delete result.scripts.packaging;
    delete result.scripts.deploy;
    if (nodeEnv === 'production') { // Product
        delete result.scripts.build;
        delete result.scripts.packaging;
        delete result.scripts.lint;
        delete result.scripts.checkDeps;
        delete result.scripts.updateDeps;
        delete result.scripts.test;
        delete result.devDependencies;
        delete result.peerDependencies;

        // TODO: must be updated later
        delete result.scripts.testUnit;
        delete result.scripts.testFunction;
    } else if (nodeEnv === 'fvt') { // FVT
        result.scripts.test = result.scripts.testFunction;
        delete result.scripts.testUnit;
        delete result.scripts.testFunction;
    } else if (nodeEnv === 'ut') { // UT
        result.scripts.test = result.scripts.testUnit;
        delete result.scripts.testUnit;
        delete result.scripts.testFunction;
    } else { // Development
        delete result.scripts.build;
        delete result.scripts.packaging;
    }

    // Write result file
    if (nodeEnv === 'production') { // Product: folder.src.destination = 'dist/'
        return fs.writeFileSync(`./${folder.src.destination}package.json`, JSON.stringify(result, null, 4), null);
    } else if (nodeEnv === 'fvt') { // FVT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return fs.writeFileSync(`./${folder.src.destination}../package.json`, JSON.stringify(result, null, 4), null);
    } else if (nodeEnv === 'ut') { // UT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return fs.writeFileSync(`./${folder.src.destination}../package.json`, JSON.stringify(result, null, 4), null);
    } else { // Development: folder.src.destination = 'dist/'
        return fs.writeFileSync(`./${folder.src.destination}package.json`, JSON.stringify(result, null, 4), null);
    }
}

// Copy gulpfile task
function copyGulpFileTask() {
    return gulp.src('./gulpfile.js')
            .pipe(gulp.dest('dist'));
}

let packagedFileName = '';
let releasedFileName = '';
// Packaging building result
async function packagingTask() {
    // Get package file name
    let releaseTypeSegment = '';
    switch (releaseType.toLowerCase()) {
        case 'beta':
            releaseTypeSegment = '-beta';
            break;
        case 'ga':
            releaseTypeSegment = '';
            break;
        default:
            releaseTypeSegment = '';
    }
    let buildTypeSegment = '';
    switch (nodeEnv.toLowerCase()) {
        case 'production':
            buildTypeSegment = '';
            break;
        case 'ut':
            buildTypeSegment = '-ut';
            break;
        case 'fvt':
            buildTypeSegment = '-fvt';
            break;
        default:
            buildTypeSegment = '';
    }
    packagedFileName = `zos-job-v${releaseVersion.replace(/\./g, '')}${releaseTypeSegment}${buildTypeSegment}-${buildTime}.tar.gz`;
    releasedFileName = `zos-job-v${releaseVersion.replace(/\./g, '')}.tar.gz`;

    if (nodeEnv === 'production') { // Product: folder.src.destination = 'dist/'
        return childProcess.execSync(`cd ./${folder.src.destination} && mkdir -p ../release && rm -rf ../release/zos-job*.tar.gz `
                + `&& rm -rf ./node_modules && npm install && rm -rf ./package-lock.json `
                + `&& tar zcf ../release/${packagedFileName} * `,
        {stdio: 'inherit'});
    } else if (nodeEnv === 'fvt') { // FVT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return childProcess.execSync(`cd ./${folder.src.destination}.. && mkdir -p ../release && rm -rf ../release/zos-job*.tar.gz `
                + `&& rm -rf ./node_modules && npm install && rm -rf ./package-lock.json `
                + `&& tar zcf ../release/${packagedFileName} * `,
        {stdio: 'inherit'});
    } else if (nodeEnv === 'ut') { // UT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return childProcess.execSync(`cd ./${folder.src.destination}.. && mkdir -p ../release && rm -rf ../release/zos-job*.tar.gz `
                + `&& rm -rf ./node_modules && npm install && rm -rf ./package-lock.json `
                + `&& tar zcf ../release/${packagedFileName} * `,
        {stdio: 'inherit'});
    } else { // Development: folder.src.destination = 'dist/'
        return childProcess.execSync(`pwd && cd ./${folder.src.destination} && mkdir -p ../release && rm -rf ../release/zos-job*.tar.gz `
                + `&& rm -rf ./package-lock.json `
                + `&& tar zcf ../release/${packagedFileName} * `,
        {stdio: 'inherit'});
    }
}

// Install dependency task
async function installDependencyTask() {
    if (nodeEnv === 'production') { // Product: folder.src.destination = 'dist/'
        return childProcess.execSync(`cd ./${folder.src.destination} && rm -rf ./node_modules && npm install && rm -rf ./package-lock.json`,
                {stdio: 'inherit'});
    } else if (nodeEnv === 'fvt') { // FVT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return childProcess.execSync(`cd ./${folder.src.destination}.. && rm -rf ./node_modules && npm install && rm -rf ./package-lock.json`,
                {stdio: 'inherit'});
    } else if (nodeEnv === 'ut') { // UT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return childProcess.execSync(`cd ./${folder.src.destination}.. && rm -rf ./node_modules && npm install && rm -rf ./package-lock.json`,
                {stdio: 'inherit'});
    } else { // Development: folder.src.destination = 'dist/'
        return childProcess.execSync(`cd ./${folder.src.destination} && rm -rf ./node_modules && npm install && rm -rf ./package-lock.json`,
                {stdio: 'inherit'});
    }
}

// Purge unused file task
async function purgeUnusedFileTask() {
    if (nodeEnv === 'production') { // Product: folder.src.destination = 'dist/'
        return childProcess.execSync(`cd ./${folder.src.destination} && rm -rf ./logs/* && find . -name ".DS_*"|xargs rm -rf`, {stdio: 'inherit'});
    } else if (nodeEnv === 'fvt') { // FVT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return childProcess.execSync(`cd ./${folder.src.destination} && rm -rf ./logs/* && find . -name ".DS_*"|xargs rm -rf && `
                + `cd ../../${folder.test.destination} && rm -rf ./logs/* && find . -name ".DS_*"|xargs rm -rf`, {stdio: 'inherit'});
    } else if (nodeEnv === 'ut') { // UT: folder.src.destination = 'dist/src/'  folder.test.destination = 'dist/test/fvt/'
        return childProcess.execSync(`cd ./${folder.src.destination} && rm -rf ./logs/* && find . -name ".DS_*"|xargs rm -rf && `
                + `cd ../../${folder.test.destination} && rm -rf ./logs/* && find . -name ".DS_*"|xargs rm -rf`, {stdio: 'inherit'});
    } else { // Development: folder.src.destination = 'dist/'
        return childProcess.execSync(`cd ./${folder.src.destination} && rm -rf ./logs/* && find . -name ".DS_*"|xargs rm -rf`, {stdio: 'inherit'});
    }
}

// // Test task
// function testTask() {
//     return childProcess.spawnSync('npm', ['test'], {stdio: 'inherit'});
// }

// // UT test task
// function testUnitTask() {
//     return childProcess.spawnSync('npm', ['run', 'testUnit'], {stdio: 'inherit'});
// }

// // FVT test task
// function testFunctionTask() {
//     if (process.argv.length > 4 && process.argv[3] === '-tc') {
//         const args = ['run', 'testFunction'].concat(process.argv[4]);
//         return childProcess.spawnSync('npm', args, {stdio: 'inherit'});
//     }
//     return childProcess.spawnSync('npm', ['run', 'testFunction'], {stdio: 'inherit'});
// }

// Note: trusted connection should be setup between local machine and dev server
// Setup steps:
//   1. Local Machine:
//     1.1 ssh-keygen -t rsa
//     1.2 scp ~/.ssh/id_rsa.pub <remote machine>
//   2. Remote Machine:
//     2.1 cat <Uploaded id_rsa.pub> >> ~/.ssh/authorized_keys

// Export gulp task
exports.clean = cleanTask;
if (nodeEnv === 'production') { // Product
    exports.build = gulp.series(cleanTask, buildSourceTask,
            createPackageJsonTask, purgeUnusedFileTask);
} else if (nodeEnv === 'fvt') { // FVT
    exports.build = gulp.series(cleanTask, buildSourceTask, buildTestCaseTask,
            createPackageJsonTask, copyGulpFileTask, purgeUnusedFileTask);
} else if (nodeEnv === 'ut') { // UT
    exports.build = gulp.series(cleanTask, buildSourceTask, buildTestCaseTask,
            createPackageJsonTask, copyGulpFileTask, purgeUnusedFileTask);
} else { // Development
    exports.build = gulp.series(cleanTask, buildSourceTask,
            createPackageJsonTask, copyGulpFileTask, purgeUnusedFileTask);
}
// exports.testUnit = testUnitTask;
// exports.testFunction = testFunctionTask;
exports.packaging = packagingTask;
exports.lint = lintTask;
exports.default = gulp.series(exports.build);
