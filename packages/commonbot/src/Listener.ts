/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type { IMessageHandlerFunction, IMessageMatcherFunction } from './types';
import Logger from './utils/Logger';

import { CommonBot } from './CommonBot';
import MessageMatcher = require('./MessageMatcher');

class Listener {
    protected bot: CommonBot;
    protected messageMatcher: MessageMatcher;
    protected logger: Logger

    // Constructor
    constructor(bot: CommonBot) {
        this.bot = bot;
        this.logger = Logger.getInstance()
        this.messageMatcher = new MessageMatcher();

        this.listen = this.listen.bind(this);
    }

    // Run listener
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listen(matcher: IMessageMatcherFunction, handler: IMessageHandlerFunction): Promise<void> {
        // Print start log
        this.logger.start(this.listen, this);

        try {
            this.logger.debug('Run base listener');
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.listen, this);
        }
    }

    // Get message matcher
    getMessageMatcher(): MessageMatcher {
        return this.messageMatcher;
    }
}

export = Listener;
