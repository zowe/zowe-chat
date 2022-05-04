/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type {IChatContextData, IMessage} from './types';
import CommonBot = require('./CommonBot');
import logger = require('./utils/Logger');

class Middleware {
    protected bot: CommonBot;

    // Constructor
    constructor(bot: CommonBot) {
        this.bot = bot;
    }

    // Run middleware
    async run(): Promise<void> {
        // Print start log
        logger.start(this.run, this);

        try {
            logger.debug('Run in base middleware');
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.run, this);
        }
    }

    // Send message back to channel
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async send(contextData: IChatContextData, messages: IMessage[]): Promise<void> {
        // Print start log
        logger.start(this.send, this);

        try {
            logger.debug('Send in base middleware');
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.send, this);
        }
    }
}

export = Middleware;
