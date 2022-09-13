/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { ChatCredential } from "./ChatCredential";
import { ChatUser } from "./ChatUser";

export class ChatPrincipal {

    private readonly chatUser: ChatUser;
    private readonly credential: ChatCredential;

    constructor(chatUser: ChatUser, mfCred: ChatCredential) {
        this.chatUser = chatUser
        this.credential = mfCred;
    }

    public getCredentials(): ChatCredential {
        return this.credential
    }

    public getUser(): ChatUser {
        return this.chatUser
    }
}