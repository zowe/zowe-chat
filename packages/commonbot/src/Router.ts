/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { CommonBot } from './CommonBot';
import { IRoute, IRouteHandlerFunction } from './types';
import Logger from './utils/Logger';


class Router {
    protected bot: CommonBot;
    protected router: IRoute;
    protected logger: Logger;

    // Constructor
    constructor(bot: CommonBot) {
        this.logger = Logger.getInstance();
        this.bot = bot;

        this.router = null;

        // Bind this pointer
        this.route = this.route.bind(this);
    }

    // Run router
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async route(basePath: string, handler: IRouteHandlerFunction): Promise<void> {
        // Print start log
        this.logger.start(this.route, this);

        try {
            this.logger.debug('Run base listener');
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.route, this);
        }
    }

    // Get router
    getRoute(): IRoute {
        return this.router;
    }

    // Set webhook
    setRoute(path: string, handler: IRouteHandlerFunction): void {
        this.router = {
            path: path,
            handler: handler,
        };

        return;
    }
}

export = Router;
