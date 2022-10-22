/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IMessageHandlerFunction, IMessageMatcherFunction } from '../../types';

import { CommonBot } from '../../CommonBot';
import { Listener } from '../../Listener';
import { Logger } from '../../utils/Logger';
import { MsteamsMiddleware } from './MsteamsMiddleware';

const logger = Logger.getInstance();

export class MsteamsListener extends Listener {
    // Constructor
    constructor(bot: CommonBot) {
        super(bot);

        // Bind this pointer
        this.listen = this.listen.bind(this);
    }

    // Run listener
    async listen(matcher: IMessageMatcherFunction, handler: IMessageHandlerFunction): Promise<void> {
        // Print start log
        logger.start(this.listen, this);

        try {
            // Check and set middleware
            let middleware = <MsteamsMiddleware> this.bot.getMiddleware();
            if (middleware === null) {
                middleware = new MsteamsMiddleware(this.bot);
                this.bot.setMiddleware(middleware);
                await middleware.run();
            }

            // Set matcher
            this.messageMatcher.addMatcher(matcher, handler);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.listen, this);
        }
    }
}
