/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/
import * as fs from "fs-extra";
import * as path from "path";
export interface ITaskFunction {
    (done?: any): any;

    description?: string;
}

export interface IGulpError extends Error {
    showStack?: boolean;
}

export function getProjectRoot(): string {
    // ensure we're in root dir or backtrack there
    let projRoot = process.cwd() + path.sep;
    const keyFile = "CONTRIBUTING.md"; // File which only exists in project root
    while (!fs.existsSync(`${projRoot}${keyFile}`)) {

        projRoot = `${projRoot}..${path.sep}`;

        if (path.resolve(projRoot) == path.resolve("/")) {
            console.log("Error trying to find project root - we're in the filesystem root.");
            console.log(`Make sure you are running from a dir under the project, and the file ${keyFile} exists in the project root.`);
            process.exit(1);
        }
    }
    return projRoot;

}