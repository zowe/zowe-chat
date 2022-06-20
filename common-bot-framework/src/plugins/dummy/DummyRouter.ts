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
        this.processAction = this.processAction.bind(this);
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

    // TODO should delete - no user interaction
    // Process user interactive actions e.g. button clicks, menu selects.
    async processAction(req: Request, res: Response): Promise<void> {
        logger.start(this.processAction, this);

        try {
            //  Set root_id to chatToolContext, so the response could be displayed in thread.
            const payload = req.body;
            logger.debug(`Action request body is ${JSON.stringify(payload)}`);

            if (payload.type === 'dialog_submission') {
                // 204 will indicate that the dialog_submission have been received.
                res.sendStatus(204);
            } else {
                // Must send {} back to Mattermost server, otherwise dialog could not be opened successfully.
                // It works fine with interactive component: button and select.
                res.send({});
            }

            let rootId: string = '';
            if (payload.context !== undefined && payload.context.rootId !== undefined && payload.context.rootId !== '') {
                rootId = payload.context.rootId;
            }
            const chatToolContext: Record<string, any> = {
                'channelId': payload.channel_id,
                'rootId': rootId,
                'body': payload,
            };

            const middleware = <DummyMiddleware>this.bot.getMiddleware();
            const user: IUser = await middleware.getUserById(payload.user_id);
            logger.debug(`user is ${JSON.stringify(user)}`);

            const channel = await middleware.getChannelById(payload.channel_id);
            logger.debug(`channel is ${JSON.stringify(channel)}`);

            const chatContext: IChatContextData = {
                'message': null,
                'bot': <CommonBot>this.bot,
                'chatToolContext': chatToolContext,
                'user': {
                    'id': payload.user_id,
                    'name': user ? user.name : '',
                    'email': user ? user.email : '',
                },
                'channel': {
                    'id': payload.channel_id,
                    'name': payload.channel_name,
                },
                'team': {
                    'id': payload.team_id,
                    'name': payload.team_domain,
                },
                'tenant': {
                    'id': '',
                    'name': '',
                },
                'chattingType': channel.chattingType,
            };
            this.router.handler(chatContext);
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.processAction, this);
        }
    }
}
