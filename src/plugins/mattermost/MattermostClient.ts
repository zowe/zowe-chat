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
import type {SuperAgentRequest} from 'superagent';
import superagent = require('superagent');
const EventEmitter = require('stream');


import logger = require('../../utils/Logger');
import Util = require('../../utils/Util');
import MattermostMiddleware = require('./MattermostMiddleware');
import {IChannel, IChattingType, IMattermostOption, IProtocol, IUser} from '../../types';

class MattermostClient extends EventEmitter {
    private rejectUnauthorized: boolean = false;
    private heartBeat: number = 30000; // millisecond

    private middleware: MattermostMiddleware;
    private option: IMattermostOption;
    private serverBaseUrl: string;
    private ws: WebSocket;

    private teamId: string;
    private messageID: number;

    private authenticated: boolean;
    private connected: boolean;
    private connecting: boolean;
    private autoReconnect: boolean;
    private reconnecting: boolean;
    private connAttempts: number;


    constructor(middleware: MattermostMiddleware, option: IMattermostOption) {
        super();

        this.middleware = middleware;
        this.option = option;

        this.serverBaseUrl = `${this.option.protocol}://${this.option.hostName}:${this.option.port}${this.option.basePath}`;

        this.teamId = null;
        this.ws = null;
        this.messageID = 0;

        this.autoReconnect = true;

        this.authenticated = false;
        this.connected = false;
        this.connecting = false;
        this.reconnecting = false;
        this.connAttempts = 0;

        this.loginWithToken = this.loginWithToken.bind(this);
        this.getTeams = this.getTeams.bind(this);
        this.getChannelById = this.getChannelById.bind(this);
        this.getChannelByName = this.getChannelByName.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.openDialog = this.openDialog.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);

        // websocket related
        this.connect = this.connect.bind(this);
        this.reconnect = this.reconnect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.sendMessageByWebsocket = this.sendMessageByWebsocket.bind(this);
    }

    // Login in with bot token
    async loginWithToken(): Promise<boolean> {
        logger.start(this.loginWithToken, this);

        try {
            const response = await this.get(`${this.serverBaseUrl}/users/me`);
            logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                this.authenticated = true;

                if (this.option.protocol === IProtocol.HTTPS) {
                    this.socketUrl = `${IProtocol.WSS}://${this.option.hostName}:${this.option.port}${this.option.basePath}/websocket`;
                } else {
                    this.socketUrl = `${IProtocol.WS}://${this.option.hostName}:${this.option.port}${this.option.basePath}/websocket`;
                }
                logger.debug(`Websocket URL: ${this.socketUrl}`);

                this.middleware.updateBotUser({id: response.body.id, name: response.body.username, email: ''});
                logger.info(`Logged in as user ${response.body.username} but not connected via websocket yet.`);

                await this.getTeams();

                // Connect websocket.
                this.connect();
                return true;
            } else {
                logger.error(`Login call failed ${response.statusMessage}`);

                this.authenticated = false;
                this._reconnecting = false;

                this.reconnect();
                return false;
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
        } finally {
            logger.end(this.loginWithToken, this);
        }
    }

    // Get the team
    async getTeams(): Promise<void> {
        logger.start(this.getTeams, this);

        try {
            const response = await this.get(`${this.serverBaseUrl}/users/me/teams`);
            logger.debug(response.statusCode);
            logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                for (const team of response.body) {
                    logger.debug(`Testing ${team.name} == ${this.option.teamUrl}`);
                    if (team.name.toLowerCase() === this.option.teamUrl.toLowerCase()) {
                        logger.info(`Found team: ${team.id}`);
                        this.teamId = team.id;
                    }
                }
            } else {
                logger.error(`Get teams failed ${response.statusMessage}`);
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
        } finally {
            logger.end(this.getTeams, this);
        }
    }

    // Get channel by channel id.
    async getChannelById(id: string): Promise<IChannel> {
        logger.start(this.getChannelById, this);

        try {
            const response = await this.get(`${this.serverBaseUrl}/channels/${id}`);
            logger.debug(response.statusCode);
            logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                const channel = {
                    id: response.body.id,
                    name: response.body.display_name,
                    chattingType: this.getChattingType(response.body.type),
                };
                return channel;
            } else {
                logger.error(`Get channel for ${id} failed ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
        } finally {
            logger.end(this.getChannelById, this);
        }
    }

    // Get channel by channel name.
    async getChannelByName(name: string): Promise<IChannel> {
        logger.start(this.getChannelByName, this);

        try {
            if (this.teamId === null) { // could not query channel by channel name without teamId.
                return null;
            }
            const response = await this.get(`${this.serverBaseUrl}/teams/${this.teamId}/channels/name/${name}`);
            logger.debug(Util.dumpResponse(response));
            if (response.statusCode === 200) {
                const channel = {
                    id: response.body.id,
                    name: response.body.display_name,
                    chattingType: this.getChattingType(response.body.type),
                };
                return channel;
            } else {
                logger.error(`Get channel for ${name} failed ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
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
            logger.warn(`Not supported channel type for the current Mattermost adapter.`);
        }
        return chattingType;
    }

    // get user by user id.
    async getUserById(id: string): Promise<IUser> {
        logger.start(this.getUserById, this);

        try {
            const response = await this.get(`${this.serverBaseUrl}/users/${id}`);
            logger.debug(response.statusCode);
            logger.debug(Util.dumpResponse(response));
            if (response.statusCode === 200) {
                const user: IUser = {id: response.body.id, name: response.body.username, email: response.body.email};
                this.middleware.addUser(response.body.id, user);
                return user;
            } else {
                logger.error(`Get user info for userId ${id} failed: ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            logger.error(Util.dumpObject(error));
        } finally {
            logger.end(this.getUserById, this);
        }
    }

    // connect to websocket.
    connect(): void {
        if (this.connecting) {
            return;
        }

        this.connecting = true;
        logger.info('Connecting...');
        const options = {rejectUnauthorized: this.rejectUnauthorized};

        // Set up websocket connection to server
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.ws = new WebSocket(this.socketUrl, options);

        this.ws.on('error', (error: any) => {
            this.connecting = false;
            logger.error(`Unhandled error: ${error}`);
        });

        this.ws.on('open', () => {
            logger.debug('On websocket open event.');
            this.connecting = false;
            this.reconnecting = false;
            this.connected = true;
            this.connAttempts = 0;
            this.lastPong = Date.now();
            const challenge = {
                action: 'authentication_challenge',
                data: {
                    token: this.option.botAccessToken,
                },
            };
            logger.debug('Sending challenge...');
            this.sendMessageByWebsocket(challenge);
            logger.info('Starting pinger...');
            this.pongTimeout = setInterval(() => {
                if (!this.connected) {
                    logger.error('Not connected in pongTimeout');
                    this.reconnect();
                    return;
                }
                if ((this.lastPong != null)
                    && ((Date.now() - this.lastPong) > (2 * this.heartBeat))) {
                    logger.error(`Last pong is too old: ${(Date.now() - this._lastPong) / 1000}`);
                    this.authenticated = false;
                    this.connected = false;
                    this.reconnect();
                    return;
                }
                logger.info('Sending ping');
                this.sendMessageByWebsocket({action: 'ping'});
            },
            this.heartBeat);
            return true;
        });

        this.ws.on('message', (data: string) => this.onMessage(JSON.parse(data)));

        this.ws.on('close', (code: number, message: string) => {
            logger.info(`on close event: code is ${code}`);
            logger.debug(`on close event: message is ${message}`);
            this._connecting = false;
            this.connected = false;
            this.socketUrl = null;
            if (this.autoReconnect) {
                return this.reconnect();
            }
            return true;
        });
    }

    // Reconnect to websocket.
    reconnect() {
        if (this.reconnecting) {
            logger.warn('Already reconnecting.');
            return false;
        }
        this.connecting = false;
        this.reconnecting = true;

        if (this.pongTimeout) {
            clearInterval(this.pongTimeout);
            this.pongTimeout = null;
        }
        this.authenticated = false;

        if (this.ws) {
            this.ws.close();
        }

        this.connAttempts += 1;

        const timeout = this.connAttempts * 1000;
        logger.info(`Reconnecting in ${timeout}ms'`);
        return setTimeout(
                () => {
                    logger.info('Attempting reconnect');
                    return this.loginWithToken();
                },
                timeout,
        );
    }

    // Disconnect websocket.
    disconnect(): boolean {
        if (!this.connected) {
            return false;
        }
        this.autoReconnect = false;
        if (this.pongTimeout) {
            clearInterval(this.pongTimeout);
            this.pongTimeout = null;
        }
        this.ws.close();
        return true;
    }

    // Receive Mattermost WebSocket events.
    onMessage(message: Record<string, any>) {
        logger.start('onMessage');

        logger.debug(`Receive message: ${Util.dumpObject(message)}`);
        switch (message.event) {
            case 'posted':
                this.middleware.processMessage(message);
                break;
            case 'added_to_team':
            case 'authentication_challenge':
            case 'channel_converted':
            case 'channel_created':
            case 'channel_deleted':
            case 'channel_member_updated':
            case 'channel_updated':
            case 'channel_viewed':
            case 'config_changed':
            case 'delete_team':
            case 'ephemeral_message':
            case 'hello':
            case 'typing':
            case 'post_edit':
            case 'post_deleted':
            case 'preference_changed':
            case 'user_added':
            case 'user_removed':
            case 'user_role_updated':
            case 'user_updated':
            case 'status_change':
            case 'webrtc':
            case 'new_user':
            case 'ping':
                break;
            default:
                // Check for `pong` response
                if ((message.data ? message.data.text : undefined) && (message.data.text === 'pong')) {
                    logger.debug('ACK ping (2)');
                    this.lastPong = Date.now();
                } else {
                    logger.debug('Received unhandled message:');
                    logger.debug(JSON.stringify(message));
                }
        }
        logger.end('onMessage');
    }

    // Send message to Mattermost channel.
    async postMessage(message: Record<string, any>, channelId: string, rootId: string): Promise<void> {
        logger.start(this.postMessage, this);

        try {
            const postData: Record<string, any> = {
                message: message,
                file_ids: [],
                create_at: 0,
                root_id: rootId,
                channel_id: channelId,
            };

            if (typeof message === 'string') {
                postData.message = message;
            } else {
                postData.message = message.message;
                if (message.props) {
                    postData.props = message.props;
                }
            }

            logger.debug(`postData is ${Util.dumpObject(postData)}`);
            await this.post(`${this.serverBaseUrl}/posts`)
                    .send(JSON.stringify(postData));
        } catch (err) {
            // Print exception stack
            logger.error(err.status_code);
            logger.error(err.id);
            logger.error(err.message);
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.postMessage, this);
        }
    }


    sendMessageByWebsocket(msg: Record<string, any>): void {
        logger.start(this.sendMessageByWebsocket, this);
        try {
            const message = {
                ...msg,
            };
            if (!this.connected) {
                return;
            }
            this.messageID += 1;
            message.id = this.messageID;
            message.seq = message.id;
            logger.debug(JSON.stringify(message));

            this.ws.send(JSON.stringify(message));
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.sendMessageByWebsocket, this);
        }
    }

    // Open dialog
    async openDialog(payload: Record<string, any>): Promise<void> {
        logger.start(this.openDialog, this);

        try {
            await this.post(`${this.serverBaseUrl}/actions/dialogs/open`)
                    .send(JSON.stringify(payload));
        } catch (e) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(e.name), e));
        } finally {
            logger.end(this.openDialog, this);
        }
    }

    post(url: string): SuperAgentRequest {
        logger.start(this.post, this);

        try {
            const agent = superagent.post(url)
                    .set('Authorization', `BEARER ${this.option.botAccessToken}`)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json');

            if (this.option.protocol === 'https') {
                agent.ca(this.option.tlsCertificate);
            }

            return agent;
        } catch (e) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(e.name), e));
        } finally {
            logger.end(this.get, this);
        }
    }

    async get(url: string): Promise<Record<string, any>> {
        logger.start(this.get, this);

        let res: Record<string, any> = {};
        try {
            const request = superagent.get(url)
                    .set('Authorization', `BEARER ${this.option.botAccessToken}`)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json');
            if (this.option.protocol === 'https') {
                request.ca(this.option.tlsCertificate);
            }
            const res = await request;
            logger.debug(Util.dumpResponse(res));
            return res;
        } catch (e) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(e.name), e));

            // Set response
            res = {...e.response};
            res.statusMessage = e.response.res.statusMessage;

            return res;
        } finally {
            logger.end(this.get, this);
        }
    }
}

export = MattermostClient;
