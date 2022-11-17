/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { ChatCredential } from "../user/ChatCredential";
import { ChatUser } from "../user/ChatUser";

export interface ICredentialProvider {

    getCredential(chatUser: ChatUser): ChatCredential | undefined;

    /**
     * Exchange Credential is a function which may be optionally implemented by Credential Providers 
     * in the case where they will exchange a user's initial credential, such as a password,
     * for an alternative credential format, such as a JWT token. 
     * 
     * If credential providers do not need to perform a login in order to exchange credential formats, they should return `true`.
     * 
     * @param chatUser 
     * @param credential 
     * 
     * @returns true if login succeeded, false otherwise.
     */
    exchangeCredential(chatUser: ChatUser, credential: string): Promise<boolean>;

    /**
     * Logs out a chat user, if applicable.
     * 
     * @param chatUser 
     */
    logout(chatUser: ChatUser): void;

}