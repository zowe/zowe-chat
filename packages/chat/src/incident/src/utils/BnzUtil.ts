/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import nodeUtil = require('util');
import crypto = require('crypto');
import jwt = require('jsonwebtoken');

class BnzUtil {
    // Constructor
    // constructor() {
    // }

    // Generate JWT token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    static generateJwtToken(payload: any, secret: string): string {
        const token = jwt.sign(payload, Buffer.from(secret, 'base64'));

        return token;
    }

    // Verify JWT token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static verifyJwtToken(token: string, secret: string): Record<string, any> {
        // Initialize result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: Record<string, any> = {
            valid: true,
            decoded: null,
            error: null,
        };

        // Verify
        try {
            result.decoded = jwt.verify(token, Buffer.from(secret, 'base64'));
            return result;
        } catch (error) {
            result.valid = false;
            result.error = error;
            return result;
        }
    }

    // Decode JWT token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static decodeJwtToken(token: string, complete: boolean = false): string | Record<string, any> {
        return jwt.decode(token, {complete: complete});
    }

}

export = BnzUtil;
