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

import { IChannel, IChattingType, IConnectionStatus, IMattermostOption, IProtocol, IUser } from '../../types';
import Logger from '../../utils/Logger';
import Util = require('../../utils/Util');
import MattermostMiddleware = require('./MattermostMiddleware');

class MattermostClient {
    private rejectUnauthorized: boolean = false;
    private heartBeat: number = 60000; // It is in millisecond.
    private autoReconnect = true;
    private logger: Logger = Logger.getInstance();

    private middleware: MattermostMiddleware;
    private option: IMattermostOption;
    private ws: WebSocket; // Websocket connection handler
    private teamId: string; // Team id for bot user.
    private reconnectCount: number;
    private lastPongTime: number;
    private pongTimer: NodeJS.Timer;
    private connectionStatus: IConnectionStatus;
    private mattermostServerBaseUrl: string;

    constructor(middleware: MattermostMiddleware, option: IMattermostOption) {
        this.middleware = middleware;
        this.option = option;
        this.ws = null;
        this.teamId = null;
        this.lastPongTime = null;
        this.pongTimer = null;
        this.reconnectCount = 0;

        this.connectionStatus = IConnectionStatus.NOT_CONNECTED;
        this.mattermostServerBaseUrl = `${this.option.protocol}://${this.option.hostName}:${this.option.port}${this.option.basePath}`;

        this.connect = this.connect.bind(this);
        this.getTeamId = this.getTeamId.bind(this);
        this.getChannelById = this.getChannelById.bind(this);
        this.getChannelByName = this.getChannelByName.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.openDialog = this.openDialog.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.reconnect = this.reconnect.bind(this);
    }

    // Connect and authenticate to Mattermost server for both REST API and websocket.
    async connect(): Promise<void> {
        this.logger.start(this.connect, this);

        try {
            if (this.connectionStatus === IConnectionStatus.CONNECTING) {
                return;
            }
            this.connectionStatus = IConnectionStatus.CONNECTING;

            // First, authenticate by Mattermost web service API.
            const response = await this.get(`${this.mattermostServerBaseUrl}/users/me`);
            this.logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                this.middleware.updateBotUser({ id: response.body.id, name: response.body.username, email: '' });
                this.logger.debug(`Logged in through REST API as user ${response.body.username}`);

                // Get bot's Team id.
                await this.getTeamId();

                // Second, connect the WebSocket and authenticate with an authentication challenge.
                const options = { rejectUnauthorized: this.rejectUnauthorized };
                let webSocketUrl = undefined;
                if (this.option.protocol === IProtocol.HTTPS) {
                    webSocketUrl = `${IProtocol.WSS}://${this.option.hostName}:${this.option.port}${this.option.basePath}/websocket`;
                } else {
                    webSocketUrl = `${IProtocol.WS}://${this.option.hostName}:${this.option.port}${this.option.basePath}/websocket`;
                }
                this.logger.debug(`The Websocket url is: ${webSocketUrl}`);

                if (this.ws !== null && this.ws !== undefined) {
                    this.ws.terminate();
                    this.ws = null;
                }
                this.ws = new WebSocket(webSocketUrl, options);

                this.ws.on('error', this.onError.bind(this));
                this.ws.on('open', this.onOpen.bind(this));
                this.ws.on('message', this.onMessage.bind(this));
                this.ws.on('ping', this.onPing.bind(this));
                this.ws.on('pong', this.onPong.bind(this));
                this.ws.on('close', this.onClose.bind(this));
            } else {
                this.logger.error(`Failed to connect to Mattermost server:  ${response.statusMessage}`);

                this.connectionStatus = IConnectionStatus.NOT_CONNECTED;
                this.reconnect();
            }
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.connect, this);
        }
    }

    // Reconnect to Mattermost server.
    private reconnect(): void {
        try {
            if (this.connectionStatus === IConnectionStatus.RECONNECTING) {
                this.logger.debug('It has been reconnecting now.');
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
            this.logger.debug(`Reconnect to Mattermost server in ${reconnectTimeout / 1000} seconds.`);
            setTimeout(
                () => {
                    this.logger.debug('Trying to reconnect to Mattermost server.');
                    this.connect();
                },
                reconnectTimeout,
            );
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        }
    }

    // Disconnect with Mattermost server.
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
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        }
    }

    private onOpen(): void {
        try {
            this.logger.debug('On open event.');

            this.reconnectCount = 0; // Clear the reconnect count.
            this.connectionStatus = IConnectionStatus.ALIVE;
            const authenticationChallenge = {
                seq: 1,
                action: 'authentication_challenge',
                data: {
                    token: this.option.botAccessToken,
                },
            };
            // Authenticate with an authentication challenge
            this.authenticate(authenticationChallenge);

            this.pongTimer = setInterval(() => {
                if (this.connectionStatus !== IConnectionStatus.ALIVE) {
                    this.logger.error('The websocket is not alive now, try to reconnect.');
                    this.reconnect();
                    return;
                }
                if ((this.lastPongTime !== null && this.lastPongTime !== undefined)
                    && ((Date.now() - this.lastPongTime) > (3 * this.heartBeat))) {
                    this.logger.error(`It has been too long after receiving preview pong, try to reconnect.`);
                    this.connectionStatus = IConnectionStatus.EXPIRED;
                    this.reconnect();
                    return;
                }
                this.logger.debug('Sending heart-beating ping to mattermost server.');
                this.ws.ping();
            },
                this.heartBeat);
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        }
    }

    // Receive Mattermost WebSocket events.
    private onMessage(data: string): void {
        this.logger.start(this.onMessage, this);

        try {
            const message: Record<string, any> = JSON.parse(data); // eslint-disable-line @typescript-eslint/no-explicit-any
            this.logger.debug(`Received message is ${Util.dumpObject(message)}`);

            if (message.event !== undefined && message.event === 'posted') {
                this.middleware.processMessage(message);
            } else if (message.event !== undefined && message.event === 'hello') {
                // Once successfully authenticated, the Mattermost server will pass a hello WebSocket event containing server version over the connection.
                // So use the time of receiving hello event as the first pong time.
                this.lastPongTime = Date.now(); // Timestamp of previous pong.
            } else {
                // Add more event handling if they are needed in the future.
                /*
                    added_to_team
                    authentication_challenge
                    channel_converted
                    channel_created
                    channel_deleted
                    channel_member_updated
                    channel_updated
                    channel_viewed
                    config_changed
                    delete_team
                    direct_added
                    emoji_added
                    ephemeral_message
                    group_added
                    leave_team
                    license_changed
                    memberrole_updated
                    new_user
                    plugin_disabled
                    plugin_enabled
                    plugin_statuses_changed
                    post_deleted
                    post_edited
                    post_unread
                    preference_changed
                    preferences_changed
                    preferences_deleted
                    reaction_added
                    reaction_removed
                    response
                    role_updated
                    status_change
                    typing
                    update_team
                    user_added
                    user_removed
                    user_role_updated
                    user_updated
                    dialog_opened
                    thread_updated
                    thread_follow_changed
                    thread_read_changed
                */
            }
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.onMessage, this);
        }
    }

    private onPong(): void {
        this.logger.debug('Received heart-beating pong from Mattermost server.');
        this.lastPongTime = Date.now(); //  Update latPongTime when receiving Pong event every time.
    }

    private onPing(): void {
        this.logger.debug('Received heart-beating ping from Mattermost server.');
        this.ws.pong();
    }

    private onClose(code: number, reason: string): void {
        this.logger.debug(`On event close, the code is ${code} and reason is ${reason}.`);
        this.connectionStatus = IConnectionStatus.CLOSED;

        if (this.autoReconnect) { // The connection is closed, try to connect.
            this.reconnect();
        }
    }

    private onError(error: Error): void {
        this.connectionStatus = IConnectionStatus.ERROR;
        this.logger.error(`On event error: ${error}`);
    }

    // Send message to Mattermost channel, group or direct message through Mattermost web service Rest API posts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendMessage(message: Record<string, any>, channelId: string, rootId: string): Promise<void> {
        this.logger.start(this.sendMessage, this);

        try {
            const postObject: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
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

            this.logger.debug(`The postObject is ${Util.dumpObject(postObject)}`);
            await this.post(`${this.mattermostServerBaseUrl}/posts`)
                .send(JSON.stringify(postObject));
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.sendMessage, this);
        }
    }

    // Send message to Mattermost server through the WebSocket.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private authenticate(message: Record<string, any>): void {
        this.logger.start(this.authenticate, this);
        try {
            if (this.connectionStatus !== IConnectionStatus.ALIVE) {
                this.logger.error('Could not send message because the websocket is not alive now.');
                return;
            }

            this.logger.debug(JSON.stringify(message));
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.authenticate, this);
        }
    }

    // Open dialog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async openDialog(payload: Record<string, any>): Promise<void> {
        this.logger.start(this.openDialog, this);

        try {
            await this.post(`${this.mattermostServerBaseUrl}/actions/dialogs/open`)
                .send(JSON.stringify(payload));
        } catch (error) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.openDialog, this);
        }
    }

    // Get Mattermost team Id for bot
    async getTeamId(): Promise<void> {
        this.logger.start(this.getTeamId, this);

        try {
            const response = await this.get(`${this.mattermostServerBaseUrl}/users/me/teams`);
            this.logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                for (const team of response.body) {
                    if (team.name.toLowerCase() === this.option.teamUrl.toLowerCase()) {
                        this.logger.debug(`Found team id: ${team.id}`);
                        this.teamId = team.id;
                    }
                }
            } else {
                this.logger.error(`Failed to get team id for bot user: ${response.statusMessage}`);
            }
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.getTeamId, this);
        }
    }

    // Get channel by channel id.
    async getChannelById(id: string): Promise<IChannel> {
        this.logger.start(this.getChannelById, this);

        try {
            const response = await this.get(`${this.mattermostServerBaseUrl}/channels/${id}`);

            if (response.statusCode === 200) {
                const channel = {
                    id: response.body.id,
                    name: response.body.display_name,
                    chattingType: this.getChattingType(response.body.type),
                };
                return channel;
            } else {
                this.logger.error(`Failed to get channel which id is ${id}: ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.getChannelById, this);
        }
    }

    // Get channel by channel name.
    async getChannelByName(name: string): Promise<IChannel> {
        this.logger.start(this.getChannelByName, this);

        try {
            if (this.teamId === null) { // could not query channel by channel name without teamId.
                this.logger.error('Could not get channel info without team id.');
                return null;
            }
            const response = await this.get(`${this.mattermostServerBaseUrl}/teams/${this.teamId}/channels/name/${name}`);

            if (response.statusCode === 200) {
                const channel = {
                    id: response.body.id,
                    name: response.body.display_name,
                    chattingType: this.getChattingType(response.body.type),
                };
                return channel;
            } else {
                this.logger.error(`Failed to get channel named ${name}: ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.getChannelByName, this);
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
            this.logger.warn(`Not supported channel type for the current Mattermost adapter.`);
        }
        return chattingType;
    }

    // Get user by user id.
    async getUserById(id: string): Promise<IUser> {
        this.logger.start(this.getUserById, this);

        try {
            const response = await this.get(`${this.mattermostServerBaseUrl}/users/${id}`);
            this.logger.debug(Util.dumpResponse(response));

            if (response.statusCode === 200) {
                const user: IUser = { id: response.body.id, name: response.body.username, email: response.body.email };
                this.middleware.addUser(response.body.id, user);
                return user;
            } else {
                this.logger.error(`Failed to get user info for userId ${id}: ${response.statusMessage}`);
                return null;
            }
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.getUserById, this);
        }
    }

    post(url: string): SuperAgentRequest {
        this.logger.start(this.post, this);

        try {
            const agent = superagent.post(url)
                .set('Authorization', `BEARER ${this.option.botAccessToken}`)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json');

            if (this.option.protocol === 'https') {
                agent.ca(this.option.tlsCertificate);
            }

            return agent;
        } catch (error) {
            this.logger.error(Util.dumpObject(error));
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
        } finally {
            this.logger.end(this.get, this);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(url: string): Promise<Record<string, any>> {
        this.logger.start(this.get, this);

        const res: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
            this.logger.debug(`url is ${url}`);
            const request = superagent.get(url)
                .set('Authorization', `BEARER ${this.option.botAccessToken}`)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json');
            if (this.option.protocol === 'https') {
                request.ca(this.option.tlsCertificate);
            }
            const res = await request;
            this.logger.debug(Util.dumpResponse(res));
            return res;
        } catch (e) {
            if (e.timeout) {
                res.statusCode = 408;
                res.statusMessage = 'Request Timeout';
            } else {
                res.statusCode = 500;
                res.statusMessage = 'Internal Server Error';
            }
            this.logger.error(Util.dumpResponse(e.response));
            this.logger.error(this.logger.getErrorStack(new Error(res.statusMessage), e));
            return res;
        } finally {
            this.logger.end(this.get, this);
        }
    }
}

export = MattermostClient;
