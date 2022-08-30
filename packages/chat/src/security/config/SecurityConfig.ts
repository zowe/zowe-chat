/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

export type SecurityConfig = {
    userStorage: string;
    encryptionKey: string;
    encryptionIv: string;
    loginStrategy: LoginStrategy
    authenticationStrategy: AuthenticationStrategy
    chatbotUser: string
    passticketOptions?: PassticketOptions
    passwordOptions?: PasswordOptions
}

export enum LoginStrategy {
    RequireLogin = "require-login",
    AutoLogin = "auto-login",
}

export enum AuthenticationStrategy {
    Passticket = "passticket",
    Password = "password",
    Token = "token",
}

export type PassticketOptions = {
    applId: string
    replay_protection: boolean
}

export type PasswordOptions = {
    filePath: string
}