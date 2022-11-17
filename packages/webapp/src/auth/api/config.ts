/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

export async function getAPIHost() {
    document.getElementById('env')?.addEventListener('load', () => {
        if (process.env.NODE_ENV === 'development' && process.env.CHAT_API_URL !== undefined) {
            return process.env.CHAT_API_URL;
            // window.env is set by our env.js in the public/ folder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((<any>window).env.API_ROOT !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (<any>window).env.API_ROOT;
        } else {
            return 'http://localhost:3000';
        }
    });
}
