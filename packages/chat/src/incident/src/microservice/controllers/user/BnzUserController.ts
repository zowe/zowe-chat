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
import type {ISecretToken} from '../../../types/BnzSecretInterface';
import type {IQueryResult} from '../../../types/BnzCommonInterface';
import {IUser, IUserRole, IUserStatus} from '../../../types/BnzUserInterface';

import BnzController = require('../BnzController');
import logger = require('../../../utils/logger');
import BnzUtil = require('../../../utils/BnzUtil');
import bnzSecret = require('../../../common/BnzSecret');
import bnzUser = require('../../../common/BnzUser');
import bnzRateLimiter = require('../../../common/BnzRateLimiter');
import {IRateLimitType} from '../../../types/BnzCommonInterface';

// User controller class
class BnzUserController extends BnzController {
    // Constructor
    constructor() {
        super();

        // Bind this pointer
        this.login = this.login.bind(this);
        this.queryUser = this.queryUser.bind(this);
        this.getUser = this.getUser.bind(this);
        this.postUser = this.postUser.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
    }

    /**
    * @swagger - public
    * paths:
    *   /auth/login:
    *     post:
    *       tags:
    *         - Authentication
    *       summary: Login to get access token
    *       description: Login Z ChatOps microservice with your user ID and password to get JWT access token before you can use other APIs
    *       operationId: authenticate
    *       requestBody:
    *          content:
    *             application/json:
    *               schema:
    *                 type: object
    *                 properties:
    *                   name:
    *                     type: string
    *                     decription: user account name
    *                   password:
    *                     type: string
    *                     decription: user account password
    *               examples:
    *                  User:
    *                     summary: User example
    *                     value:
    *                        name: tester
    *                        password: pas$w0rd
    *       responses:
    *         '201':
    *           description: 'Successful operation. statusMessage: OK.'
    *           content:
    *             application/json:
    *               schema:
    *                 type: array
    *                 items:
    *                   $ref: ''
    *         '400':
    *           $ref: '#/components/responses/Bad_Request'
    *         '401':
    *           $ref: '#/components/responses/Unauthorized'
    *         '404':
    *           $ref: '#/components/responses/Not_Found'
    *         '408':
    *           $ref: '#/components/responses/Request_Timeout'
    *         '500':
    *           $ref: '#/components/responses/Internal_Server_Error'
    */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        // Print start log
        logger.start(this.login, this);

        // Login to get token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: Record<string, any> = {};
        try {
            // Limit login IP
            let retryAfterTime = await bnzRateLimiter.limitAccessRate(IRateLimitType.LOGIN_IP, req.ip);
            logger.debug(`req.ip: ${req.ip}`);
            if (retryAfterTime > 0) {
                res.set('Retry-After', String(retryAfterTime));
                BnzUtil.setResponseStatus(res, 429, BnzUtil.getMessage('BNZCOM015E')); // Too many login failures for same IP within a short time

                // Print error message
                logger.error(`retryAfterTime: ${retryAfterTime}`);
                logger.error(`Too many login failures during short time!`);

                return;
            } else {
                // Limit login user
                retryAfterTime = await bnzRateLimiter.limitAccessRate(IRateLimitType.LOGIN_USER, `${req.body.user}_${req.ip}`);

                if (retryAfterTime > 0) {
                    res.set('Retry-After', String(retryAfterTime));
                    // Too many consecutive login failures for same user within a short time
                    BnzUtil.setResponseStatus(res, 429, BnzUtil.getMessage('BNZCOM016E'));

                    // Print error message
                    logger.error(`retryAfterTime: ${retryAfterTime}`);
                    logger.error(`Too many consecutive login failures during short time!`);

                    return;
                }
            }

            // Get user
            const userName = req.body.name;
            const userPassword = req.body.password;

            // Query existing user by name
            const users = bnzUser.findUserByName(userName);

            // Check user name
            if (users.length === 0) {
                BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                logger.error(`The user ${userName} does not exist!`);
            } else if (users.length === 1) { // User name matched
                // Check password
                const hashText = BnzUtil.getHashText(userPassword, users[0].salt);
                if (hashText === users[0].password) { // Password matched
                    // Get random secret
                    const secretToken: ISecretToken = {
                        userName: users[0].name,
                        secret: BnzUtil.geRandomBytes(64),
                    };

                    // Update secret
                    const updateSucceed = await bnzSecret.updateTokenSecret(secretToken);

                    // Check update result
                    if (updateSucceed) {
                        // Initialize payload
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const payload: Record<string, any> = {
                            sub: users[0].name,
                            iss: 'IBM Z ChatOps microservice',
                            name: users[0].name,
                            iat: null,
                            exp: null,
                        };
                        payload.iat = Math.floor(Date.now()/ 1000);

                        // Set expire time
                        if (users[0].tokenValidTimePeriod === undefined
                            || users[0].tokenValidTimePeriod === null) { // Expire after the default time period: 5 minutes
                            payload.exp = payload.iat + (60 * 5);
                        } else if (users[0].tokenValidTimePeriod > 0) { // Expire after the specified time period
                            payload.exp = payload.iat + users[0].tokenValidTimePeriod;
                        } else { // Not expired
                            payload.exp = payload.iat + (24 * 60 * 60 * 365 * 100); // 100 years
                        }

                        // Generate Token
                        result.token = BnzUtil.generateJwtToken(payload, secretToken.secret);

                        // Set response body
                        BnzUtil.setResponseStatus(res, 200);
                    } else {
                        BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E'));
                        logger.error(`Failed to update the token secret of the user ${userName}!`);
                    }

                    // Update access limit rate
                    await bnzRateLimiter.rewardAccessRate(IRateLimitType.LOGIN_IP, req.ip, 1);
                    await bnzRateLimiter.resetAccessRate(IRateLimitType.LOGIN_USER, `${req.body.user}_${req.ip}`);
                } else {
                    BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                    logger.error(`The password of the user ${userName} is wrong!`);
                }
            } else {
                BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                logger.error(`Duplicated user ${userName} exists!`);
            }
        } catch (e) {
            BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
        } finally {
            res.send(result);
            // Print end log
            logger.end(this.login, this);
        }
    }

    /**
    * @swagger - public
    * paths:
    *   /user:
    *     get:
    *       tags:
    *         - User
    *       summary: Get user account
    *       description: Query existing user account
    *       operationId: queryUser
    *       security:
    *         - bearerAuth: []
    *       parameters:
    *         - name: name
    *           in: query
    *           description: The name of this user account.
    *           schema:
    *             type: string
    *       responses:
    *         '200':
    *           description: 'Successful operation. statusMessage: OK.'
    *           content:
    *             application/json:
    *               schema:
    *                 type: array
    *                 items:
    *                   $ref: '#/components/schemas/User'
    *         '400':
    *           $ref: '#/components/responses/Bad_Request'
    *         '401':
    *           $ref: '#/components/responses/Unauthorized'
    *         '404':
    *           $ref: '#/components/responses/Not_Found'
    *         '408':
    *           $ref: '#/components/responses/Request_Timeout'
    *         '500':
    *           $ref: '#/components/responses/Internal_Server_Error'
    */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async queryUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        // Print start log
        logger.start(this.queryUser, this);

        // Print query parameters
        logger.info(`Request parameters: ${JSON.stringify(req.query, null, 2)}`);

        // Initialize query result
        let result: IQueryResult = {
            statusCode: 0,
            statusMessage: '',
            records: [],
        };

        // Get Systems
        try {
            // Query
            result = await this.getUser(new URLSearchParams(<Record<string, string>>req.query));

            // Set status code and message
            BnzUtil.setResponseStatus(res, result.statusCode, result.statusMessage);
        } catch (e) {
            BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
        } finally {
            res.send(result.records);

            // Print end log
            logger.end(this.queryUser, this);
        }
    }

    // Get user
    async getUser(searchParams: URLSearchParams): Promise<IQueryResult> {
        // Print start log
        logger.start(this.getUser, this);

        // Print search parameters
        logger.info(`Search parameters: ${searchParams.toString()}`);

        // Initialize query result
        const result: IQueryResult = {
            statusCode: 0,
            statusMessage: '',
            records: [],
        };

        try {
            // Get request parameters
            const name: string = searchParams.get('name'); // Optional

            // Query existing user by name
            const users = bnzUser.findUserByName(name);

            // Set result
            for (const user of users) {
                result.records.push({
                    name: user.name,
                    // password: user.password,
                    // salt: user.salt,
                    tokenValidTimePeriod: user.tokenValidTimePeriod,
                    status: user.status,
                    role: user.role,
                    createdDate: user.createdDate,
                    modifiedDate: user.modifiedDate,
                    lockedDate: user.lockedDate,
                    expiredDate: user.expiredDate,
                });
            }

            // Set response status & message
            result.statusCode = 200;
            result.statusMessage = 'OK';

            return result;
        } catch (e) {
            result.statusCode = 500;
            result.statusMessage = BnzUtil.getMessage('BNZCOM001E'); // // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(result.statusMessage), e));

            return result;
        } finally {
            // Print end log
            logger.end(this.getUser, this);
        }
    }

    // This endpoint have the same path with get user, So don't specify path in this swagger doc, or it'll fail.
    /**
    * @swagger - public
    *     post:
    *       tags:
    *         - User
    *       summary: Add new user account.
    *       description: Add new user account
    *       operationId: postUser
    *       security:
    *         - bearerAuth: []
    *       requestBody:
    *          content:
    *             application/json:
    *               schema:
    *                 type: object
    *                 properties:
    *                   name:
    *                     type: string
    *                     decription: user account name
    *                   password:
    *                     type: string
    *                     decription: user account password
    *                   tokenValidTimePeriod:
    *                     type: integer
    *                     decription: >-
    *                       Valid time period in second after token is created, default value is 300 seconds.
    *                       If 0 (zero) is specified, the token will not expire.
    *                   status:
    *                     type: string
    *                     decription: user account status
    *                     enum:
    *                       - OPEN
    *                       - EXPIRED
    *                       - LOCKED
    *                   role:
    *                     type: string
    *                     enum:
    *                       - ADMIN
    *                       - USER
    *                       - INTEGRATOR
    *                     decription: user account role
    *               examples:
    *                  User:
    *                     summary: User example
    *                     value:
    *                        name: tester
    *                        password: pas$w0rd
    *                        tokenValidTimePeriod: 300
    *                        status: OPEN
    *                        role: USER
    *       responses:
    *         '201':
    *           description: 'Successful operation. statusMessage: OK.'
    *           content:
    *             application/json:
    *               schema:
    *                 type: array
    *                 items:
    *                   $ref: ''
    *         '400':
    *           $ref: '#/components/responses/Bad_Request'
    *         '401':
    *           $ref: '#/components/responses/Unauthorized'
    *         '404':
    *           $ref: '#/components/responses/Not_Found'
    *         '408':
    *           $ref: '#/components/responses/Request_Timeout'
    *         '500':
    *           $ref: '#/components/responses/Internal_Server_Error'
    */
    async postUser(req: Request, res: Response, next: NextFunction): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Print start log.
        logger.start(this.postUser, this);

        // Get request body
        const user = <IUser>req.body;

        let result = {};
        try {
            // Check operator privilege
            const operator = this.getOperator(req);
            if (operator === null) {
                BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                logger.error(`Can't find the operator!`);
                return;
            } else {
                if (operator.role !== IUserRole.ADMIN) {
                    BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                    logger.error(`Not allowed to create new users by any operator without ADMIN role!`);
                    return;
                }
            }

            // Check whether the user already exist
            const users = bnzUser.findUserByName(user.name);

            // Insert user if not exist
            if (users.length >= 1) {
                BnzUtil.setResponseStatus(res, 409, BnzUtil.getMessage('BNZCOM008E'));
                logger.error(`User ${user.name} already exists!`);
            } else {
                // Get new user data
                const userData: IUser = {
                    name: user.name,
                    password: user.password,
                    salt: null,
                    tokenValidTimePeriod: user.tokenValidTimePeriod,
                    status: user.status,
                    role: user.role,
                    createdDate: null,
                    modifiedDate: null,
                    lockedDate: null,
                    expiredDate: null,
                };

                // Check input data
                const invalidField = this.isUserDataValid(userData);
                if (invalidField !== '') {
                    BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM007E', invalidField));
                    logger.error(`Required data field ${invalidField} is missing in the input data ${JSON.stringify(user, null, 2)}.`);
                    return;
                }

                // Encrypt password
                const salt = BnzUtil.geRandomBytes(64);
                const hashText = BnzUtil.getHashText(userData.password, salt);
                userData.password = hashText;
                userData.salt = salt;

                // Add created timestamp
                userData.createdDate = BnzUtil.formatUtcDateTime(new Date());

                // Add modified/locked/expired timestamp
                userData.modifiedDate = '';
                userData.lockedDate = '';
                userData.expiredDate = '';

                // Add user
                const added = bnzUser.addUser(userData);

                if (added) {
                    // Set response status & message
                    BnzUtil.setResponseStatus(res, 201, 'Created');
                    delete userData.password;
                    delete userData.salt;
                    result = userData;
                } else {
                    BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E'));
                    logger.error(`Failed to create user ${user.name}`);
                }
            }
        } catch (e) {
            BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
        } finally {
            res.send(result);

            // Print end log
            logger.end(this.postUser, this);
        }
    }

    // Get operator
    getOperator(req: Request): IUser {
        let operator: IUser = null;

        // Get operator name
        const authorizationSegments = req.headers['authorization'].split(' ');
        if (authorizationSegments[0] === 'Bearer') { // Token authentication
            // Decode token
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decodedToken: any = BnzUtil.decodeJwtToken(authorizationSegments[1], true);

            // Check user name
            if (decodedToken.payload.name === undefined || decodedToken.payload.name === null || decodedToken.payload.name.trim().length === 0) {
                logger.error(`The payload of the token ${authorizationSegments[1]} is wrong!`);
            } else {
                // Find operator
                const users = bnzUser.findUserByName(decodedToken.payload.name);

                // Set operator
                if (users.length > 0) {
                    operator = users[0];
                }
            }
        }

        return operator;
    }

    // Check whether user field value is valid
    isUserDataValid(user: IUser): string {
        // Check name
        if (user.name !== null && user.name.trim() === '') {
            return 'user';
        }

        // Check password
        if (user.password !== null) {
            if (user.password.trim() === '') {
                logger.error('The user password is empty.');
                return 'password';
            } else {
                if (user.password.length < 8) {
                    logger.error('The length of user password is less than 8.');
                    return 'password';
                } else {
                    // Check whether there is one special character
                    let hasSpecialChar = false;
                    const specialChars = ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';',
                        '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'];
                    for (const char of specialChars) {
                        if (user.password.indexOf(char) >= 0) {
                            hasSpecialChar = true;
                            break;
                        }
                    }
                    if (hasSpecialChar === false) {
                        logger.error('No any special character in the user password.');
                        return 'password';
                    }

                    // Check whether there is an number
                    let hasNumber = false;
                    const numberChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    for (const char of numberChars) {
                        if (user.password.indexOf(char) >= 0) {
                            hasNumber = true;
                            break;
                        }
                    }
                    if (hasNumber === false) {
                        logger.error('No any number character in the user password.');
                        return 'password';
                    }
                }
            }
        }

        // Check salt
        if (user.salt !== null && user.salt.trim() === '') {
            return 'salt';
        }

        // Check tokenValidTimePeriod
        if (user.tokenValidTimePeriod !== null && user.tokenValidTimePeriod < 0) {
            return 'tokenValidTimePeriod';
        }

        // Check role
        if (user.role !== null && user.role !== IUserRole.ADMIN && user.role !== IUserRole.USER && user.role !== IUserRole.INTEGRATOR) {
            return 'role';
        }

        // Check status
        if (user.status !== null && user.status !== IUserStatus.OPEN && user.status !== IUserStatus.EXPIRED && user.status !== IUserStatus.LOCKED) {
            return 'status';
        }

        // Date time format example: 1994-11-05T13:15:30Z
        const regexp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}Z/;

        // Check created date
        if (user.createdDate !== null && user.createdDate !== '' && !regexp.test(user.createdDate)) {
            return 'createdDate';
        }

        // Check modified date
        // Date time format example: 1994-11-05T13:15:30Z
        if (user.modifiedDate !== null && user.modifiedDate !== '' && !regexp.test(user.modifiedDate)) {
            return 'modifiedDate';
        }

        // Check locked date
        // Date time format example: 1994-11-05T13:15:30Z
        if (user.lockedDate !== null && user.lockedDate !== '' && !regexp.test(user.lockedDate)) {
            return 'lockedDate';
        }

        // Check expired date
        // Date time format example: 1994-11-05T13:15:30Z
        if (user.expiredDate !== null && user.expiredDate !== '' && !regexp.test(user.expiredDate)) {
            return 'expiredDate';
        }

        return '';
    }

    /**
    * @swagger - public
    *     put:
    *       tags:
    *         - User
    *       summary: Update user account
    *       description: Update user account
    *       operationId: updateUser
    *       security:
    *         - bearerAuth: []
    *       parameters:
    *         - name: name
    *           in: query
    *           description: The name of this user account.
    *           required: true
    *           schema:
    *             type: string
    *       requestBody:
    *          content:
    *             application/json:
    *               schema:
    *                 type: object
    *                 properties:
    *                   password:
    *                     type: string
    *                     decription: user account password
    *                   tokenValidTimePeriod:
    *                     type: integer
    *                     decription: >-
    *                       Valid time period in second after token is created, default value is 300 seconds.
    *                       If 0 (zero) is specified, the token will not expire.
    *                   status:
    *                     type: string
    *                     decription: user account status
    *                     enum:
    *                       - OPEN
    *                       - EXPIRED
    *                       - LOCKED
    *                   role:
    *                     type: string
    *                     enum:
    *                       - ADMIN
    *                       - USER
    *                       - INTEGRATOR
    *                     decription: user account role
    *               examples:
    *                  User:
    *                     summary: User example
    *                     value:
    *                        password: pas$w0rd
    *                        tokenValidTimePeriod: 300
    *                        status: OPEN
    *       responses:
    *         '202':
    *           description: 'Successful operation. statusMessage: OK.'
    *           content:
    *             application/json:
    *               schema:
    *                 type: array
    *                 items:
    *                   $ref: ''
    *         '400':
    *           $ref: '#/components/responses/Bad_Request'
    *         '401':
    *           $ref: '#/components/responses/Unauthorized'
    *         '404':
    *           $ref: '#/components/responses/Not_Found'
    *         '408':
    *           $ref: '#/components/responses/Request_Timeout'
    *         '500':
    *           $ref: '#/components/responses/Internal_Server_Error'
    */
    async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Print start log
        logger.start(this.updateUser, this);

        // Get request parameter
        const name = <string>req.query.name;
        logger.debug(`name is ${name}`);

        const result = {};
        try {
            // Check operator privilege
            const operator = this.getOperator(req);
            if (operator === null) {
                BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                logger.error(`Can't find the operator!`);
                return;
            } else {
                if (operator.role !== IUserRole.ADMIN) {
                    if (operator.name !== name) {
                        BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                        logger.error(`Not allowed to update users by any operator without ADMIN role or it is not himself!`);
                        return;
                    } else {
                        if (req.body.role !== undefined) {
                            BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                            logger.error(`Not allowed to change role by any operator without ADMIN role!`);
                            return;
                        }
                    }
                }
            }

            // Check whether the user already exist
            const users = bnzUser.findUserByName(name);

            // update user when find only one result.
            if (users.length < 1) {
                BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM013E'));
                logger.error(`Could not find user ${name}`);
            } else {
                // Get updated user data
                const userData: IUser = {
                    name: name,
                    password: req.body.password === undefined ? null : req.body.password,
                    salt: null,
                    tokenValidTimePeriod: req.body.tokenValidTimePeriod === undefined ? null : req.body.tokenValidTimePeriod,
                    status: req.body.status === undefined ? null : req.body.status,
                    role: req.body.role === undefined ? null : req.body.role,
                    createdDate: null,
                    modifiedDate: null,
                    lockedDate: null,
                    expiredDate: null,
                };

                // Check input data
                const invalidField = this.isUserDataValid(userData);
                if (invalidField !== '') {
                    BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM007E', invalidField));
                    logger.error(`The value of data field ${invalidField} is invalid in the input data ${JSON.stringify(req.body, null, 2)}.`);
                    return;
                }

                // Encrypt password
                if (userData.password !== null) {
                    const salt = BnzUtil.geRandomBytes(64);
                    const hashText = BnzUtil.getHashText(userData.password, salt);
                    userData.password = hashText;
                    userData.salt = salt;
                }

                // Add modified timestamp
                userData.modifiedDate = BnzUtil.formatUtcDateTime(new Date());

                // Update user
                const updated = bnzUser.updateUser(userData);

                if (updated) {
                    // Set response status & message
                    BnzUtil.setResponseStatus(res, 201, 'Updated');
                    // result = userData;
                } else {
                    BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E'));
                    logger.error(`Failed to update user ${userData.name}`);
                }
            }
        } catch (e) {
            BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
        } finally {
            res.send(result);

            // Print end log
            logger.end(this.updateUser, this);
        }
    }

    /**
    * @swagger
    *     delete:
    *       tags:
    *         - User
    *       summary: Delete user account
    *       description: Delete user account by name
    *       operationId: deleteUser
    *       security:
    *         - bearerAuth: []
    *       parameters:
    *         - name: name
    *           in: query
    *           description: The name of this user account.
    *           required: true
    *           schema:
    *             type: string
    *       responses:
    *         '202':
    *           description: 'Successful operation. statusMessage: OK.'
    *           content:
    *             application/json:
    *               schema:
    *                 type: array
    *                 items:
    *                   $ref: ''
    *         '400':
    *           $ref: '#/components/responses/Bad_Request'
    *         '401':
    *           $ref: '#/components/responses/Unauthorized'
    *         '404':
    *           $ref: '#/components/responses/Not_Found'
    *         '408':
    *           $ref: '#/components/responses/Request_Timeout'
    *         '500':
    *           $ref: '#/components/responses/Internal_Server_Error'
    */
    async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Print start log
        logger.start(this.deleteUser, this);

        // Get request parameter
        const name = <string>req.query.name;
        logger.debug(`name is ${name}`);


        const result = {};
        try {
            // Check operator privilege
            const operator = this.getOperator(req);
            if (operator === null) {
                BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                logger.error(`Can't find the operator!`);
                return;
            } else {
                if (operator.role !== IUserRole.ADMIN) {
                    BnzUtil.setResponseStatus(res, 401, BnzUtil.getMessage('BNZCOM004E'));
                    logger.error(`Not allowed to delete users by any operator without ADMIN role!`);
                    return;
                }
            }

            // Check whether the user already exist
            const users = bnzUser.findUserByName(name);

            // update user when find only one result.
            if (users.length < 1) {
                BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM013E'));
                logger.error(`Could not find user ${name}`);
            } else {
                const deleted = bnzUser.deleteUser(name);

                if (deleted) {
                    // Set response status & message
                    BnzUtil.setResponseStatus(res, 202, 'Deleted');
                } else {
                    BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E'));
                    logger.error(`Failed to delete user ${name}`);
                }
            }
        } catch (e) {
            BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
        } finally {
            res.send(result);

            // Print end log
            logger.end(this.deleteUser, this);
        }
    }
}

/**
 * @swagger - public
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           decription: The internal id of this user account
 *         name:
 *           type: string
 *           decription: user account name
 *         tokenValidTimePeriod:
 *           type: integer
 *           decription: >-
 *             Valid time period in second after token is created, default value is 300 seconds.
 *             If 0 (zero) is specified, the token will not expire.
 *         status:
 *           type: string
 *           decription: user account status
 *           enum:
 *             - OPEN
 *             - EXPIRED
 *             - LOCKED
 *         role:
 *           type: string
 *           enum:
 *             - ADMIN
 *             - USER
 *             - INTEGRATOR
 *           decription: user account role
 *         createdDate:
 *           type: string
 *           format: date-time
 *           example: 2020-10-23T23:23:23Z
 *           decription: The account created timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
 *         modifiedDate:
 *           type: string
 *           format: date-time
 *           example: 2020-10-23T23:23:23Z
 *           decription: The account updated timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
 *         lockedDate:
 *           type: string
 *           format: date-time
 *           example: 2020-11-23T21:21:21Z
 *           decription: The account locked timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
 *         expiredDate:
 *           type: string
 *           format: date-time
 *           example: 2020-12-23T22:22:22Z
 *           decription: The account expired timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
 */

export = BnzUserController;
