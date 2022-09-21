/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type {Request, Response, NextFunction} from 'express';

import express = require('express');
const authRouter = express.Router(); // eslint-disable-line
import logger = require('../../utils/logger');
import BnzUtil = require('../../utils/BnzUtil');
import bnzSecret = require('../../common/BnzSecret');

import BnzUserController = require('../controllers/user/BnzUserController');
const bnzUserController = new BnzUserController();

// Authentication: /login
authRouter.post('/login', bnzUserController.login);

// Authenticate
function authenticate(req: Request, res: Response, next: NextFunction): void {
    // Print start log
    logger.start('authenticate', 'router', 'auth.js');

    let passed = false;
    try {
        if (req.headers['authorization'] === undefined) {
            BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM010E'));
            logger.error(`Header authorization is not specified!`);
            passed = false;
        } else {
            const authorizationSegments = req.headers['authorization'].split(' ');
            // if (authorizationSegments[0] === 'Basic') { // user name / password authentication
            //     const credentials = Buffer.from(authorizationSegments[1], 'base64').toString().split(':');
            //     const userName = credentials[0];
            //     const userPassword = credentials[1];
            // }
            if (authorizationSegments[0] === 'Bearer') { // Token authentication
                // Decode token
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const decodedToken: any = BnzUtil.decodeJwtToken(authorizationSegments[1], true);
                logger.debug(`Decoded token: ${JSON.stringify(decodedToken, null, 2)}`);

                // Check user name
                if (decodedToken.payload.name === undefined || decodedToken.payload.name === null || decodedToken.payload.name.trim().length === 0) {
                    BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM011E'));
                    logger.error(`The payload of the token ${authorizationSegments[1]} is wrong!`);
                    passed = false;
                } else {
                    // Get user secret
                    const tokenSecret = bnzSecret.getTokenSecret(decodedToken.payload.name);
                    if (tokenSecret.secret === undefined) { // No secret
                        BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E'));
                        logger.error(`The secret of the user ${decodedToken.payload.name} is missing!`);
                        passed = false;
                    } else {
                        // Verify token
                        const result = BnzUtil.verifyJwtToken(authorizationSegments[1], tokenSecret.secret);
                        logger.debug(`JWT verify result: ${JSON.stringify(result, null, 2)}`);

                        // Check result
                        if (result.valid === true) { // Valid
                            passed = true;
                        } else {
                            BnzUtil.setResponseStatus(res, 400, `${BnzUtil.getMessage('BNZCOM011E')}: ${result.error.name} - ${result.error.message}`);
                            logger.error(`The token of the user ${decodedToken.payload.name} is wrong!`);
                            logger.error(`Token verification failed: ${result.error}`);
                            passed = false;
                        }
                    }
                }
            } else { // Other
                BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM010E'));
                logger.error(`Not supported authentication method!`);
                passed = false;
            }
        }
    } catch (e) {
        passed = false;
        BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // 500: Internal server error

        // Print exception stack
        logger.error(logger.getErrorStack(new Error(e.name), e));
    } finally {
        // Print end log
        logger.end('authenticate', 'router', 'auth.js');
        if (passed === true) {
            next();
        } else {
            res.send({});
        }
    }
}

export = {authRouter, authenticate};
