/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import fs from 'fs';
import path from 'path';
import * as nodeUtil from 'util';
import * as yaml from 'js-yaml';
import i18next from 'i18next';
import { IMaskingPattern } from '../types';

export class Util {
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
  static dumpRequest(req: any, formatted = false, includeAllProperties = false): string {
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
  static dumpResponse(res: any, formatted = false, includeAllProperties = false): string {
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

  // Read YAML file
  static readYamlFile(filePath: string): unknown {
    let content = null;
    try {
      if (fs.existsSync(filePath)) {
        content = yaml.load(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      console.error(`Exception occurred when read the YAML files ${filePath}!`);
      console.error(error.stack);
    }

    return content;
  }

  // Get the canonical path name by resolving ., .., and symbolic links
  static getRealPath(filePath: string): string {
    let realPath = null;
    try {
      if (filePath !== null && filePath !== undefined) {
        realPath = fs.realpathSync(path.normalize(filePath));
      }
    } catch (error) {
      console.error(`Exception occurred when get the real path for ${filePath}!`);
      console.error(error.stack);
    }

    return realPath;
  }

  // Get the error message defined in translation resource
  static getErrorMessage(errorCode: string, option: unknown): string {
    return (
      `${errorCode}: ${i18next.t('errorCode.' + errorCode + '.text', <any>option)}` +
      `\n${i18next.t('errorCode.' + errorCode + '.reason', <any>option)}` +
      `\n${i18next.t('errorCode.' + errorCode + '.action', <any>option)}`
    );
  }

  // Mask sensitive info. in the console or log output
  static maskSensitiveInfo(text: string, pattern: IMaskingPattern = null): string {
    // Patterns used to mask the sensitive info. in the log
    // TODO: add one configuration file to track the pattern and make user able to customize it
    let maskingPatterns: IMaskingPattern[] = [];
    if (pattern === null || pattern === undefined) {
      maskingPatterns = [
        {
          pattern: '--password .*?( |"|\'|\r|\n|$)',
          replacement: '--password ********\n',
        },
        {
          pattern: 'Password": {0,1}".*?"', //   "Password": "********" | "botPassword": "********"
          replacement: 'Password": "********"',
        },
        {
          pattern: "Password': {0,1}'.*?'", //  'Password': '********'
          replacement: "Password': '********'",
        },
        {
          pattern: 'token": {0,1}".*?"', // "botAccessToken": "********"  | "token": "********" | "appToken": "********"
          replacement: 'token": "********"',
        },
        {
          pattern: 'Password":{"type":"plain_text_input","value":".*?"}',
          replacement: 'Password":{"type":"plain_text_input","value":"********"}',
        },
        {
          pattern: '"signingSecret": {0,1}".*?"',
          replacement: '"signingSecret": "********"',
        },
      ];
    } else {
      maskingPatterns.push(pattern);
    }

    let result = text;
    if (text !== undefined && text !== null && text.trim() !== '') {
      for (const pattern of maskingPatterns) {
        const regex = new RegExp(pattern.pattern, 'ig');
        result = result.replace(regex, pattern.replacement);
      }
    }
    return result;
  }
}
