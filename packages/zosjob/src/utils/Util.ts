/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import fs = require('fs');

class Util {
    static packageName: string = '@zowe/zos-job-for-zowe-chat';
    // Constructor
    // constructor() {
    // }
    static getPackageName(): string {
        try {
            if (Util.packageName === '') {
                const filePath = `${__dirname}/../package.json`;
                const jsonFileContent = fs.readFileSync(filePath, 'utf-8');
                const packageJsonData = JSON.parse(jsonFileContent);
                Util.packageName = packageJsonData.name;
            }
        } catch {
            Util.packageName = '';
        }
        return Util.packageName;
    }
}

export = Util;
