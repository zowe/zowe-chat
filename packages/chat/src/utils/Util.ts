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
import nodeUtil = require('util');

class Util {
    // Constructor
    // constructor() {
    // }

    // Dump JavaScript object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static dumpObject(obj: Record<string, any>, depth: number = null): string {
        return nodeUtil.inspect(obj, { compact: false, depth: depth });
    }

    // Dump request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    static dumpRequest(req: any, formatted: boolean = false, includeAllProperties: boolean = false): string {
        // Check input parameter
        if (req === undefined || req === null) {
            return 'Request is undefined';
        }

        // Set dump result header
        const dumpResultHeader = `Dump request for URL: ${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl}`;

        // Dump
        let result = '';
        if (includeAllProperties) {
            result = nodeUtil.inspect(req, { compact: false, depth: null });
        } else {
            // Set dumped fields
            const dumpedFields = {
                url: req.url,
                method: req.method,
                baseUrl: req.baseUrl,
                originalUrl: req.originalUrl,
                params: req.params,
                query: req.query,
                body: req.body,
                httpVersion: req.httpVersion,
                headers: req.headers,
                cookies: req.cookies,
                signedCookies: req.signedCookies,
                _startTime: req._startTime,
                _remoteAddress: req._remoteAddress,
                statusCode: req.statusCode,
                statusMessage: req.statusMessage,
            };

            result = nodeUtil.inspect(dumpedFields, { compact: false, depth: null });
        }

        if (formatted) {
            return `${dumpResultHeader}\n${result}`;
        } else {
            return `${dumpResultHeader}\n${Util.concatLines(result)}`;
        }
    }
    // Concatenate lines
    static concatLines(text: string): string {
        const lines = text.split(/\r\n|\n\r|\r|\n/);

        let result = '';
        for (const line of lines) {
            result = result + line.trim();
        }

        return result;
    }

    // Dump response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    static dumpResponse(res: any, formatted: boolean = false, includeAllProperties: boolean = false): string {
        // Check input parameter
        if (res === undefined || res === null) {
            return 'Response is undefined';
        }

        // Set dump result header
        let dumpResultHeader = `Dump response for URL: `;
        if (res.request !== undefined) {
            dumpResultHeader = dumpResultHeader + `${res.request.method} ${res.request.url}`;
        }

        // Dump
        let result = '';
        if (includeAllProperties) {
            result = nodeUtil.inspect(res, { compact: false, depth: null });
        } else {
            // Set dumped fields
            const dumpedFields = {
                body: res.body,
                headers: res.headers,
                header: res.header,
                statusCode: res.statusCode,
                status: res.status,
                statusType: res.statusType,
                statusMessage: res.statusMessage,
                info: res.info,
                ok: res.ok,
                redirect: res.redirect,
                clientError: res.clientError,
                serverError: res.serverError,
                error: res.error,
                created: res.created,
                accepted: res.accepted,
                noContent: res.noContent,
                badRequest: res.badRequest,
                unauthorized: res.unauthorized,
                notAcceptable: res.notAcceptable,
                forbidden: res.forbidden,
                notFound: res.notFound,
                munprocessableEntity: res.munprocessableEntity,
                type: res.type,
                links: res.links,
            };

            result = nodeUtil.inspect(dumpedFields, { compact: false, depth: null });
        }

        if (formatted) {
            return `${dumpResultHeader}\n${result}`;
        } else {
            return `${dumpResultHeader}\n${Util.concatLines(result)}`;
        }
    }

    // Get package name in package.json file
    static getPackageName(filePath: string): string {
        let name = '';

        try {
            // Check file path
            if (fs.existsSync(filePath) === true) {
                // Read file
                const fileContent = fs.readFileSync(filePath, 'utf8');

                // Convert to JSON object
                const obj = JSON.parse(fileContent);

                // Get package name
                name = obj.name;
            }
        } catch (error) {
            console.error(`Failed to read or parse the package file: ${filePath}`);
            console.error(error);
            console.error(error.stack);
        }

        return name;
    }
}

export = Util;