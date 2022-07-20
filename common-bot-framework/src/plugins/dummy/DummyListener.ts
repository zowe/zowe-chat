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

import CommonBot = require('../../CommonBot');
import Listener = require('../../Listener');
import logger = require('../../utils/Logger');
import { DummyMiddleware } from './DummyMiddleware';

class DummyListener extends Listener {

    constructor(bot: CommonBot) {
        super(bot);
        this.listen = this.listen.bind(this);
    }

    async listen(matcher: IMessageMatcherFunction, handler: IMessageHandlerFunction): Promise<void> {
        logger.start(this.listen, this);
        try {
            let middleware = <DummyMiddleware>this.bot.getMiddleware();
            if (middleware === null) {
                middleware = new DummyMiddleware(this.bot);
                this.bot.setMiddleware(middleware);
                await middleware.run();
            }

            this.messageMatcher.addMatcher(matcher, handler);
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.listen, this);
        }
    }
}

export = DummyListener;
