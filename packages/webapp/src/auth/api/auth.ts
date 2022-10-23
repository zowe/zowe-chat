/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/


import * as axios from 'axios';
import { LoginResponse } from './LoginResponse';

// TODO: Investigate/fix
// const API_HOST = (process.env.CHAT_API_HOST) ? process.env.CHAT_API_HOST : "";
/*
* This represents some generic auth provider API, like Firebase.
*/
const chatAuthProvider = {
    isAuthenticated: false,
    signin(challenge: string, user: string, password: string, callback: (response: LoginResponse) => void) {
    // use axios to authenticate
        axios.default.post(`/api/v1/auth/login`, {
            challenge: challenge,
            user: user,
            password: password,
        }).then((response) => {
            if (response.status === 200) {
                chatAuthProvider.isAuthenticated = true;
                callback({
                    success: true,
                    serverResponse: '',
                });
            } else {
                chatAuthProvider.isAuthenticated = false;
                callback({
                    success: false,
                    serverResponse: (response.data !== undefined) ? response.data : 'There was an error logging in.',
                });
            }
        }).catch((error) => {
            chatAuthProvider.isAuthenticated = false;
            callback({
                success: false,
                serverResponse: (error?.response.data !== undefined) ? error?.response.data : 'There was an unknown error logging in.',
            });
        });
    },
    signout(callback: VoidFunction) {
        chatAuthProvider.isAuthenticated = false;
        callback();
    },
};

export { chatAuthProvider };
