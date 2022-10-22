/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import type { IRouteHandlerFunction } from '../../types';

import { CommonBot } from '../../CommonBot';
import { Router } from '../../Router';
import { Logger } from '../../utils/Logger';
import { MsteamsMiddleware } from './MsteamsMiddleware';

const logger = Logger.getInstance();

export class MsteamsRouter extends Router {
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
            // Check and set middleware
            let middleware = <MsteamsMiddleware> this.bot.getMiddleware();
            if (middleware === null) {
                middleware = new MsteamsMiddleware(this.bot);
                this.bot.setMiddleware(middleware);
                await middleware.run();
            }

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
