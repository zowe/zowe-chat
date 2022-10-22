/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IBotOption, IChatContextData, IChatToolType, IMattermostBotLimit, IMessage, IMessageHandlerFunction, IMessageMatcherFunction,
    IMsteamsBotLimit, IRouteHandlerFunction, ISlackBotLimit } from './types';

import { Listener } from './Listener';
import { Logger } from './utils/Logger';
import { Router } from './Router';
import { Middleware } from './Middleware';

import fs from 'fs';
import { BotLimit } from './BotLimit';
import { MattermostBotLimit } from './plugins/mattermost/MattermostBotLimit';
import { SlackBotLimit } from './plugins/slack/SlackBotLimit';
import { MsteamsBotLimit } from './plugins/msteams/MsteamsBotLimit';

const logger = Logger.getInstance();
export class CommonBot {
    private option: IBotOption;
    private limit: BotLimit | MattermostBotLimit | SlackBotLimit | MsteamsBotLimit;
    private middleware: Middleware;
    private listeners: Listener[]; // MsteamsListener | SlackListener[] | MattermostListener[];
    private router: Router; // | MsteamsRouter | SlackRouter | MattermostRouter;

    // Constructor
    constructor(option: IBotOption) {
        this.option = option;
        logger.info(`Bot option: ${JSON.stringify(this.option, null, 4)}`);

        // Create Limit instance
        if (this.option.chatTool.type === IChatToolType.MATTERMOST) {
            this.limit = new MattermostBotLimit();
        } else if (this.option.chatTool.type === IChatToolType.SLACK) {
            this.limit = new SlackBotLimit();
        } else if (this.option.chatTool.type === IChatToolType.MSTEAMS) {
            this.limit = new MsteamsBotLimit();
        } else {
            this.limit = null;
        }

        this.middleware = null;
        this.listeners = [];
        this.router = null;

        this.listen = this.listen.bind(this);
        this.route = this.route.bind(this);
        this.send = this.send.bind(this);
    }

    // Get option
    getOption(): IBotOption {
        return this.option;
    }

    // Set option
    setOption(option: IBotOption): void {
        this.option = option;
    }

    // Get limit
    getLimit(): IMattermostBotLimit | ISlackBotLimit | IMsteamsBotLimit {
        if (this.limit !== null) {
            return this.limit.getLimit();
        } else {
            return null;
        }
    }

    // Get middleware
    getMiddleware(): Middleware {
        return this.middleware;
    }

    // Set middleware
    setMiddleware(middleware: Middleware): void {
        this.middleware = middleware;
    }

    // Listen all messages send to bot
    async listen(matcher: IMessageMatcherFunction, handler: IMessageHandlerFunction): Promise<void> {
        // Print start log
        logger.start(this.listen, this);

        try {
            // Get chat tool type
            const chatToolType = this.option.chatTool.type;

            // Create listener
            let listener: Listener = null;
            const pluginFileName = `${chatToolType.substring(0, 1).toUpperCase()}${chatToolType.substring(1)}Listener`;
            logger.info(`Loading listener ${chatToolType}/${pluginFileName} ...`);
            if (fs.existsSync(`${__dirname}/plugins/${chatToolType}`) === false ) {
                logger.error(`Unsupported chat tool: ${chatToolType}`);
                throw new Error(`Unsupported chat tool`);
            } else {
                if (fs.existsSync(`${__dirname}/plugins/${chatToolType}/${pluginFileName}.js`) === false) {
                    logger.error(`The listener file "${__dirname}/plugins/${chatToolType}/${pluginFileName}.js" does not exist!`);
                    throw new Error(`The required listener file "${__dirname}/plugins/${chatToolType}/${pluginFileName}.js" does not exist!`);
                } else {
                    const ChatToolListener = require(`./plugins/${chatToolType}/${pluginFileName}`);
                    listener = new ChatToolListener[pluginFileName](this);
                }
            }
            this.listeners.push(listener);

            // Listen
            await listener.listen(matcher, handler);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.listen, this);
        }
    }

    // Get listeners
    getListeners(): Listener[] {
        return this.listeners;
    }

    // Add listener
    addListener(listener: Listener): void {
        this.listeners.push(listener);
    }

    // Set webhook router
    async route(basePath: string, handler: IRouteHandlerFunction): Promise<void> {
        // Print start log
        logger.start(this.route, this);

        try {
            // Get chat tool type
            const chatToolType = this.option.chatTool.type;

            // Create router
            const pluginFileName = `${chatToolType.substring(0, 1).toUpperCase()}${chatToolType.substring(1)}Router`;
            logger.info(`Loading router ${chatToolType}/${pluginFileName} ...`);
            if (fs.existsSync(`${__dirname}/plugins/${chatToolType}`) === false ) {
                logger.error(`Unsupported chat tool: ${chatToolType}`);
                throw new Error(`Unsupported chat tool`);
            } else {
                if (fs.existsSync(`${__dirname}/plugins/${chatToolType}/${pluginFileName}.js`) === false) {
                    logger.error(`The router file "${__dirname}/plugins/${chatToolType}/${pluginFileName}.js" does not exist!`);
                    throw new Error(`The required router file "${__dirname}/plugins/${chatToolType}/${pluginFileName}.js" does not exist!`);
                } else {
                    const ChatToolRouter = require(`./plugins/${chatToolType}/${pluginFileName}`);
                    this.router = new ChatToolRouter[pluginFileName](this);
                }
            }

            // Run router
            await this.router.route(basePath, handler);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.route, this);
        }
    }

    // Get router
    geRouter(): Router {
        return this.router;
    }

    // Send message to channel
    async send(chatContextData: IChatContextData, messages: IMessage[]): Promise<void> {
        // Print start log
        logger.start(this.send, this);

        try {
            await this.middleware.send(chatContextData, messages);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.send, this);
        }
    }
}
