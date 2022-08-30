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
import { ITaskFunction } from "./GulpHelpers";

const license: ITaskFunction = (done: (err: Error) => void) => {
    // process all typescript files
    require("glob")(
        "{__mocks__,packages,__tests__,jenkins}{/**/*.js,/**/*.ts}",
        { "ignore": ['**/node_modules/**', '**/lib/**','**/gulp/**'] },
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

exports.license = license;
