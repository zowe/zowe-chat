/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type { Request, Response } from 'express';
import { IActionType, IChatContextData, IEvent, IPayloadType, IRouteHandlerFunction, IUser } from '../../types';
import CommonBot = require('../../CommonBot');
import Router = require('../../Router');
import MattermostMiddleware = require('./MattermostMiddleware');

class MattermostRouter extends Router {
    // Constructor
    constructor(bot: CommonBot) {
        super(bot);

        // Bind this pointer
        this.route = this.route.bind(this);
        this.processAction = this.processAction.bind(this);
    }

    // Run router
    async route(path: string, handler: IRouteHandlerFunction): Promise<void> {
        // Print start log
        this.logger.start(this.route, this);

        try {
            // Set router
            this.router = {
                path: path,
                handler: handler,
            };

            // Get bot option
            const option = this.bot.getOption();

            // Set router
            await option.messagingApp.app.post(this.router.path, this.processAction);
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.route, this);
        }
    }

    // Process user interactive actions e.g. button clicks, menu selects.
    async processAction(req: Request, res: Response): Promise<void> {
        // Print start log
        this.logger.start(this.processAction, this);

        try {
            //  Set root_id to chatToolContext, so the response could be displayed in thread.
            const payload = req.body;
            this.logger.debug(`Action request body is ${JSON.stringify(payload)}`);

            // Get  event
            const event: IEvent = {
                'pluginId': '',
                'action': {
                    'id': '',
                    'type': null,
                    'token': '',
                },
            };
            if (payload.type === 'dialog_submission') {
                // 204 will indicate that the dialog_submission have been received.
                res.sendStatus(204);

                // Set event
                const segments = payload.state.split(':');
                if (segments.length >= 3) {
                    event.pluginId = segments[0];
                    event.action.id = segments[1];
                    event.action.token = segments[2];
                } else {
                    this.logger.error(`The data format of state is wrong!\n state=${payload.state}`);
                }
                event.action.type = IActionType.DIALOG_SUBMIT;
            } else {
                // Must send {} back to Mattermost server, otherwise dialog could not be opened successfully.
                // It works fine with interactive component: button and select.
                res.send({});

                // Set event
                event.pluginId = payload.context.pluginId;
                event.action.id = payload.context.action.id;
                event.action.token = payload.context.action.token;
                if (payload.type === 'select') {
                    event.action.type = IActionType.DROPDOWN_SELECT;
                } else if (payload.type === 'button') {
                    if (payload.context.action.type !== undefined) {
                        event.action.type = payload.context.action.type;
                    } else {
                        if (payload.context.action.id.startsWith('DIALOG_OPEN_')) {
                            event.action.type = IActionType.DIALOG_OPEN;
                        } else {
                            event.action.type = IActionType.BUTTON_CLICK;
                        }
                    }
                } else {
                    event.action.type = IActionType.UNSUPPORTED;
                    this.logger.error(`Unsupported Mattermost interactive component: ${payload.type}`);
                }
            }

            let rootId: string = '';
            if (payload.context !== undefined && payload.context.rootId !== undefined && payload.context.rootId !== '') {
                rootId = payload.context.rootId;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chatToolContext: Record<string, any> = {
                'channelId': payload.channel_id,
                'rootId': rootId,
                'body': payload,
            };

            const middleware = <MattermostMiddleware>this.bot.getMiddleware();
            const user: IUser = await middleware.getUserById(payload.user_id);
            this.logger.debug(`user is ${JSON.stringify(user)}`);

            const channel = await middleware.getChannelById(payload.channel_id);
            this.logger.debug(`channel is ${JSON.stringify(channel)}`);

            const chatContextData: IChatContextData = {
                'payload': {
                    'type': IPayloadType.EVENT,
                    'data': event,
                },
                'context': {
                    'chatting': {
                        'bot': this.bot,
                        'type': channel.chattingType,
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
                    },
                    'chatTool': chatToolContext,
                },
            };

            this.router.handler(chatContextData);
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.processAction, this);
        }
    }
}

export = MattermostRouter;
