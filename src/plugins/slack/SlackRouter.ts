/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type {IRouteHandlerFunction} from '../../types';

import CommonBot = require('../../CommonBot');
import Router = require('../../Router');
import logger = require('../../utils/Logger');

class SlackRouter extends Router {
    // Constructor
    constructor(bot: CommonBot) {
        super(bot);

        // Bind this pointer
        this.route = this.route.bind(this);
    }

    // Run router
    async route(path: string, handler: IRouteHandlerFunction): Promise<void> {
        // Print start log
        logger.start(this.route, this);

        try {
            // Set router
            this.router = {
                path: path,
                handler: handler,
            };
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.route, this);
        }
    }
}

export = SlackRouter;
