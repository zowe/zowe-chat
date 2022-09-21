/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type {IUser} from '../types/BnzUserInterface';

import fs = require('fs');
import BnzUtil = require('../utils/BnzUtil');
import logger = require('../utils/logger');

class BnzUser {
    private static instance: BnzUser;
    private filePath: string;

    constructor() {
        if (BnzUser.instance === undefined) {
            this.filePath = `${__dirname}/../config/.user.json`;

            BnzUser.instance = this;
        }

        return BnzUser.instance;
    }

    // Get the singleton instance
    static getInstance(): BnzUser {
        if (BnzUser.instance === undefined) {
            BnzUser.instance = new BnzUser();
        }

        return BnzUser.instance;
    }

    // Read user file
    private readUserFile(): IUser[] {
        let user: IUser[] = [];
        try {
            if (fs.existsSync(this.filePath)) {
                const fileContent = fs.readFileSync(this.filePath, 'utf8');
                user = JSON.parse(fileContent);
                logger.debug(`User: ${JSON.stringify(user, null, 2)}`);
            } else {
                logger.error(`User File ${this.filePath} does not exist!`);
                throw new Error(`User File ${this.filePath} does not exist!`);
            }

            return user;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(`Failed to read the user file ${this.filePath}`), error));
            throw new Error(`Failed to read the user file ${this.filePath}`);
        }
    }

    // Get user
    getUser(): IUser[] {
        return this.readUserFile();
    }

    // Find user by name
    findUserByName(name: string): IUser[] {
        // Get all users
        const users = this.getUser();

        if (name === null || name === undefined) {
            return users;
        } else {
            // Find user
            const results: IUser[] = [];
            for (const user of users) {
                if (user.name.toLowerCase() === name.toLowerCase()) {
                    results.push(user);
                }
            }

            return results;
        }
    }

    // Save user
    saveUser(users: IUser[]): boolean {
        let result = false;

        try {
            if (fs.existsSync(this.filePath)) {
                // Backup old file
                const backupDate = BnzUtil.formatDateTime(new Date());
                fs.copyFileSync(this.filePath, `${this.filePath}.bak.${backupDate}`);

                // Write package.json
                fs.writeFileSync(this.filePath, JSON.stringify(users, null, 4), 'utf8');

                // Backup old file
                fs.unlinkSync(`${this.filePath}.bak.${backupDate}`);

                result = true;
            } else {
                logger.error(`File ${this.filePath} does not exist!`);
                throw new Error(`User File ${this.filePath} does not exist!`);
            }

            return result;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(`Failed to save the user file ${this.filePath}`), error));

            return result;
        }
    }

    // Add user
    addUser(user: IUser): boolean {
        let added = false;

        if (user !== null) {
            // Get user
            const users = this.getUser();

            // Add user
            users.push(user);

            // Save the new user
            added = this.saveUser(users);
        }

        return added;
    }

    // Update user
    updateUser(user: IUser): boolean {
        let updated = false;

        if (user !== null) {
            // Get user
            const users = this.getUser();

            // Update user if found
            for (let i = 0; i < users.length; i++) {
                if (users[i].name === user.name) {
                    if (user.password !== null) {
                        users[i].password = user.password;
                    }
                    if (user.salt !== null) {
                        users[i].salt = user.salt;
                    }
                    if (user.tokenValidTimePeriod !== null) {
                        users[i].tokenValidTimePeriod = user.tokenValidTimePeriod;
                    }
                    if (user.role !== null) {
                        users[i].role = user.role;
                    }
                    if (user.status !== null) {
                        users[i].status = user.status;
                    }
                    if (user.createdDate !== null) {
                        users[i].createdDate = user.createdDate;
                    }
                    if (user.modifiedDate !== null) {
                        users[i].modifiedDate = user.modifiedDate;
                    }
                    if (user.lockedDate !== null) {
                        users[i].lockedDate = user.lockedDate;
                    }
                    if (user.expiredDate !== null) {
                        users[i].expiredDate = user.expiredDate;
                    }
                }
            }

            // Save the update
            updated = this.saveUser(users);
        }

        return updated;
    }

    // Delete user
    deleteUser(name: string): boolean {
        let deleted = false;

        if (name !== null) {
            // Get user
            const users = this.getUser();

            // Delete user if found
            const results: IUser[] = [];
            for (let i = 0; i < users.length; i++) {
                if (users[i].name !== name) {
                    results.push(users[i]);
                }
            }

            // Save the result
            deleted = this.saveUser(results);
        }

        return deleted;
    }
}

const bnzUser = BnzUser.getInstance();
// Object.freeze(bnzUser);

export = bnzUser;
