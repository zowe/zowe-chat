/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type { IUser, IRouteHandlerFunction, IChatContextData } from '../../types';
import type { Request, Response } from 'express';
import CommonBot = require('../../CommonBot');
import Router = require('../../Router');
import logger = require('../../utils/Logger');
import { DummyMiddleware } from './DummyMiddleware';

export class DummyRouter extends Router {
    constructor(bot: CommonBot) {
        super(bot);

        // Bind this pointer
        this.route = this.route.bind(this);
    }

    async route(path: string, handler: IRouteHandlerFunction): Promise<void> {
        logger.start(this.route, this);

        try {
            this.router = {
                path: path,
                handler: handler,
            };

            const option = this.bot.getOption();
            await option.messagingApp.app.post(this.router.path, ()=>{});
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.route, this);
        }
    }
}
