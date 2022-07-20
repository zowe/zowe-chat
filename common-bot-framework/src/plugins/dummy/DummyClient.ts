/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import WebSocket = require('ws');
import type { SuperAgentRequest } from 'superagent';
import superagent = require('superagent');

import logger = require('../../utils/Logger');
import Util = require('../../utils/Util');
import { DummyMiddleware } from './DummyMiddleware';
import { IChannel, IChattingType, IMattermostOption, IProtocol, IUser, IConnectionStatus } from '../../types';

export class DummyClient {
    private heartBeat: number = 60000; // It is in millisecond.
    private autoReconnect = true;

    private middleware: DummyMiddleware;
    private option: IMattermostOption; // use mattermost option types so don't expose new dummy type in bot configuration TODO check this
    private ws: WebSocket; // Websocket connection handler
    private teamId: string = 'dummy-team-id';
    private reconnectCount: number;
    private lastPongTime: number;
    private pongTimer: NodeJS.Timer;
    private connectionStatus: IConnectionStatus;
    private dummyServerRestBaseUrl: string;
    private dummyServerWsBaseUrl: string;

    constructor(middleware: DummyMiddleware, option: IMattermostOption) {
        this.middleware = middleware;
        this.option = option;
        this.ws = null;
        this.lastPongTime = null;
        this.pongTimer = null;
        this.reconnectCount = 0;

        this.connectionStatus = IConnectionStatus.NOT_CONNECTED;
        const urlPostfix = `://${this.option.hostName}:${this.option.port}${this.option.basePath}`;
        this.dummyServerRestBaseUrl = `${this.option.protocol}${urlPostfix}`;
        this.dummyServerWsBaseUrl = `${this.option.protocol === IProtocol.HTTPS ? IProtocol.WSS : IProtocol.WS}${urlPostfix}`;

        this.connect = this.connect.bind(this);
        this.getChannelByName = this.getChannelByName.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.reconnect = this.reconnect.bind(this);
    }

    // Connect and authenticate to local dummy server for both REST API and websocket.
    async connect(): Promise<void> {
        logger.start(this.connect, this);

        try {
            if (this.connectionStatus === IConnectionStatus.CONNECTING) {
                return;
            }
            this.connectionStatus = IConnectionStatus.CONNECTING;

            // First authenticate with REST API
            const response = await this.get(`${this.dummyServerRestBaseUrl}/auth`);
            logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                this.middleware.updateBotUser({ id: response.body.id, name: response.body.username, email: '' });
                logger.debug(`Logged in through REST API as user ${response.body.username}`);

                // Second, connect the WebSocket and authenticate with an authentication challenge.
                let webSocketUrl = undefined;
                if (this.option.protocol === IProtocol.HTTPS) {
                    webSocketUrl = `${this.dummyServerWsBaseUrl}/websocket`;
                } else {
                    webSocketUrl = `${this.dummyServerWsBaseUrl}/websocket`;
                }
                logger.debug(`The Websocket url is: ${webSocketUrl}`);

                if (this.ws !== null && this.ws !== undefined) {
                    this.ws.terminate();
                    this.ws = null;
                }
                this.ws = new WebSocket(webSocketUrl, {rejectUnauthorized: false});

                this.ws.on('error', this.onError.bind(this));
                this.ws.on('open', this.onOpen.bind(this));
                this.ws.on('message', this.onMessage.bind(this));
                this.ws.on('ping', this.onPing.bind(this));
                this.ws.on('pong', this.onPong.bind(this));
                this.ws.on('close', this.onClose.bind(this));
            } else {
                logger.error(`Failed to connect to local dummy server:  ${response.statusMessage}`);

                this.connectionStatus = IConnectionStatus.NOT_CONNECTED;
                this.reconnect();
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.connect, this);
        }
    }

    private reconnect(): void {
        try {
            if (this.connectionStatus === IConnectionStatus.RECONNECTING) {
                logger.debug('Reconnecting now.');
                return;
            }
            this.connectionStatus = IConnectionStatus.RECONNECTING;

            // Clear the ping/pong timer.
            if (this.pongTimer !== null) {
                clearInterval(this.pongTimer);
                this.pongTimer = null;
            }

            if (this.ws !== null) {
                this.ws.terminate();
                this.ws = null;
            }

            this.reconnectCount += 1;
            const reconnectTimeout = this.reconnectCount * 2000;
            logger.debug(`Reconnect to local dummy server in ${reconnectTimeout / 1000} seconds.`);
            setTimeout(
                () => {
                    logger.debug('Trying to reconnect to local dummy server.');
                    this.connect();
                },
                reconnectTimeout,
            );
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        }
    }

    disconnect(): void {
        try {
            // Clear the ping/pong timer.
            if (this.pongTimer !== null) {
                clearInterval(this.pongTimer);
                this.pongTimer = null;
            }
            if (this.ws !== null) {
                this.ws.terminate();
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        }
    }

    private onOpen(): void {
        try {
            logger.debug('On open event.');

            this.reconnectCount = 0; // Clear the reconnect count.
            this.connectionStatus = IConnectionStatus.ALIVE;
            const authenticationChallenge = {
                seq: 1,
                action: 'authentication_challenge',
                data: {
                    token: this.option.botAccessToken,
                },
            };

            this.authenticate(authenticationChallenge);

            this.pongTimer = setInterval(() => {
                if (this.connectionStatus !== IConnectionStatus.ALIVE) {
                    logger.error('The websocket is not alive now, try to reconnect.');
                    this.reconnect();
                    return;
                }
                if ((this.lastPongTime !== null && this.lastPongTime !== undefined)
                    && ((Date.now() - this.lastPongTime) > (3 * this.heartBeat))) {
                    logger.error(`It has been too long after receiving preview pong, try to reconnect.`);
                    this.connectionStatus = IConnectionStatus.EXPIRED;
                    this.reconnect();
                    return;
                }
                logger.debug('Sending heart-beating ping to local dummy server.');
                this.ws.ping();
            },
                this.heartBeat);
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        }
    }

    private onMessage(data: string): void {
        logger.start(this.onMessage, this);

        try {
            logger.debug(`Received message is '${data}'`);
            const message: Record<string, any> = JSON.parse(data);

            if (message.event !== undefined && message.event === 'posted') {
                this.middleware.processMessage(message);
            } else if (message.event !== undefined && message.event === 'hello') {
                // Once successfully authenticated, the local dummy server will pass a hello WebSocket event containing server version over the connection.
                // So use the time of receiving hello event as the first pong time.
                this.lastPongTime = Date.now();
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.onMessage, this);
        }
    }

    private onPong(): void {
        logger.debug('Received heart-beating pong from local dummy server.');
        this.lastPongTime = Date.now();
    }

    private onPing(): void {
        logger.debug('Received heart-beating ping from local dummy server.');
        this.ws.pong();
    }

    private onClose(code: number, reason: string): void {
        logger.debug(`On event close, the code is ${code} and reason is ${reason}.`);
        this.connectionStatus = IConnectionStatus.CLOSED;

        if (this.autoReconnect) {
            this.reconnect();
        }
    }

    private onError(error: Error): void {
        this.connectionStatus = IConnectionStatus.ERROR;
        logger.error(`On event error: ${error}`);
    }

    async sendMessage(message: Record<string, any>, channelId: string, rootId: string): Promise<void> {
        logger.start(this.sendMessage, this);

        try {
            const postObject: Record<string, any> = {
                message: message,
                root_id: rootId,
                channel_id: channelId,
            };

            if (typeof message === 'string') {
                postObject.message = message;
            } else {
                postObject.message = message.message;
                if (message.props !== undefined) {
                    postObject.props = message.props;
                }
            }

            logger.debug(`The post data is ${Util.dumpObject(postObject)}`);
            await this.post(`${this.dummyServerRestBaseUrl}/posts`)
                .send(JSON.stringify(postObject));
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.sendMessage, this);
        }
    }

    private authenticate(message: Record<string, any>): void {
        logger.start(this.authenticate, this);
        try {
            if (this.connectionStatus !== IConnectionStatus.ALIVE) {
                logger.error('Could not send message because the websocket is not alive now.');
                return;
            }

            logger.debug(JSON.stringify(message));
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.authenticate, this);
        }
    }

    async getChannelByName(name: string): Promise<IChannel> {
        logger.start(this.getChannelByName, this);

        try {
            if (this.teamId === null) { // could not query channel by channel name without teamId.
                logger.error('Could not get channel info without team id.');
                return null;
            }
            const response = await this.get(`${this.dummyServerRestBaseUrl}/teams/${this.teamId}/channels/name/${name}`);

            if (response.statusCode === 200) {
                const channel = {
                    id: response.body.id,
                    name: response.body.display_name,
                    chattingType: this.getChattingType(response.body.type),
                };
                return channel;
            } else {
                logger.error(`Failed to get channel named ${name}: ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.getChannelByName, this);
        }
    }

    getChattingType(type: string): IChattingType {
        let chattingType: IChattingType = IChattingType.UNKNOWN;
        if (type == 'D') { // direct message
            chattingType = IChattingType.PERSONAL;
        } else if (type == 'O') { // public channel
            chattingType = IChattingType.PUBLIC_CHANNEL;
        } else if (type == 'P') { // private channel
            chattingType = IChattingType.PRIVATE_CHANNEL;
        } else if (type == 'G') { // group chat
            chattingType = IChattingType.GROUP;
        } else {
            logger.warn(`Not supported channel type for the current local dummy server adapter.`);
        }
        return chattingType;
    }

    async getUserById(id: string): Promise<IUser> {
        logger.start(this.getUserById, this);

        try {
            const response = await this.get(`${this.dummyServerRestBaseUrl}/users/${id}`);
            logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                const user: IUser = { id: response.body.id, name: response.body.username, email: response.body.email };
                this.middleware.addUser(response.body.id, user);
                return user;
            } else {
                logger.error(`Failed to get user info for userId ${id}: ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.getUserById, this);
        }
    }

    post(url: string): SuperAgentRequest {
        logger.start(this.post, this);

        try {
            const agent = superagent.post(url)
                .set('Authorization', `BEARER ${this.option.botAccessToken}`)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json');

            if (this.option.protocol === IProtocol.HTTPS) {
                agent.ca(this.option.tlsCertificate);
            }

            return agent;
        } catch (error) {
            logger.error(Util.dumpObject(error));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.get, this);
        }
    }

    async get(url: string): Promise<Record<string, any>> {
        logger.start(this.get, this);

        const res: Record<string, any> = {};
        try {
            logger.debug(`url is ${url}`);
            const request = superagent.get(url)
                .set('Authorization', `BEARER ${this.option.botAccessToken}`)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json');
            if (this.option.protocol === IProtocol.HTTPS) {
                request.ca(this.option.tlsCertificate);
            }
            const res = await request;
            logger.debug(Util.dumpResponse(res));
            return res;
        } catch (e) {
            if (e.timeout) {
                res.statusCode = 408;
                res.statusMessage = 'Request Timeout';
            } else {
                res.statusCode = 500;
                res.statusMessage = 'Internal Server Error';
            }
            logger.error(Util.dumpResponse(e.response));
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
            return res;
        } finally {
            logger.end(this.get, this);
        }
    }
}
