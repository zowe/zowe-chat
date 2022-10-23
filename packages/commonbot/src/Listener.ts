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

import { CommonBot } from './CommonBot';
import { Logger } from './utils/Logger';
import { MessageMatcher } from './MessageMatcher';

const logger = Logger.getInstance();
export class Listener {
    protected bot: CommonBot;
    protected messageMatcher: MessageMatcher;

    // Constructor
    constructor(bot: CommonBot) {
        this.bot = bot;
        this.messageMatcher = new MessageMatcher();

        this.listen = this.listen.bind(this);
    }

    // Run listener
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listen(matcher: IMessageMatcherFunction, handler: IMessageHandlerFunction): Promise<void> {
        // Print start log
        logger.start(this.listen, this);

        try {
            logger.debug('Run base listener');
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.listen, this);
        }
    }

    // Get message matcher
    getMessageMatcher(): MessageMatcher {
        return this.messageMatcher;
    }
}
