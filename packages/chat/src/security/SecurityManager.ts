/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IUser } from "@zowe/commonbot";
import * as crypto from "crypto";
import { AppConfig, AuthType } from "../config/base/AppConfig";
import { UserConfigManager } from "../config/UserConfigManager";
import { Logger } from "../utils/Logger";
import { LoginService, LoginStrategyType, SecurityConfig } from "./config/SecurityConfig";
import { SecurityConfigSchema } from "./config/SecurityConfigSchema";
import { ICredentialProvider } from "./credentials/ICredentialProvider";
import { PasswordProvider } from "./credentials/PasswordProvider";
import { TokenProvider } from "./credentials/TokenProvider";
import { ZosmfHost, ZosmfLogin } from "./login/ZosmfLogin";
import { IUserMapping } from "./mapping/IUserMapping";
import { UserFileMapping } from "./mapping/UserFileMapping";
import { ChatPrincipal } from "./user/ChatPrincipal";
import { ChatUser } from "./user/ChatUser";

export class SecurityManager {

    // TODO: Do we need config manager and a ref to security config? Will we be reloading config dynamically?
    private readonly configManager: UserConfigManager;
    private readonly appConfig: AppConfig
    private readonly userMap: IUserMapping;
    private readonly log: Logger;
    private securityConfig: SecurityConfig;
    private credentialProvider: ICredentialProvider;

    constructor(appConfig: AppConfig, configManager: UserConfigManager, log: Logger) {
        this.log = log;
        this.appConfig = appConfig
        this.configManager = configManager;
        this.log.debug("Initializing security facility");
        this.securityConfig = this.configManager.getConfigFromSchema(SecurityConfigSchema);

        let cryptKey: Buffer = Buffer.from(this.securityConfig.encryptionKey, 'base64');
        if (cryptKey === undefined || cryptKey.length == 0) {
            cryptKey = crypto.randomBytes(32)
            this.securityConfig.encryptionKey = cryptKey.toString('base64');
        }
        let cryptIv: Buffer = Buffer.from(this.securityConfig.encryptionIv, 'base64');
        if (cryptIv === undefined || cryptIv.length == 0) {
            cryptIv = crypto.randomBytes(16);
            this.securityConfig.encryptionIv = cryptIv.toString('base64');
        }

        // TODO: choose backing mapping service from configuration?
        this.userMap = new UserFileMapping(this.securityConfig.userStorage, cryptKey, cryptIv, this.log)

        this.log.info(`Using ${this.securityConfig.authenticationStrategy} authentication strategy`);
        switch (this.appConfig.security.authMode) {
            /*case AuthenticationStrategy.Passticket:
                if (!process.arch.startsWith('s390')) {
                    this.log.error("Passticket authentication is only supported when running on z/OS");
                    throw Error("Passticket authentication is only supported when running on z/OS");
                }
                this.credentialProvider = new PassticketProvider(this.securityConfig, this.log);
                this.log.debug("Using passticket provider for downstream authentications")
                break;*/
            case AuthType.PASSWORD:
                this.credentialProvider = new PasswordProvider(this.securityConfig, cryptIv, cryptKey, this.log);
                this.log.debug("Using password provider for downstream authentications")
                break;
            case AuthType.TOKEN:
                this.credentialProvider = new TokenProvider(this.securityConfig, this.log);
                this.log.debug("Using zOSMF Token provider for downstream authentications")
                break;
            default:
                throw new Error("Unknown authentication strategy: " + this.securityConfig.authenticationStrategy);
        }


        this.writeConfig()
        this.log.debug("Security facility initialized");
    }


    public async authenticateUser(principal: ChatPrincipal): Promise<boolean> {
        // TODO: Write authentiction logic
        let loggedIn = false;
        const loginSection = this.securityConfig.loginStrategy

        if (loginSection.strategy == LoginStrategyType.RequireLogin) {

            if (loginSection.authService.service == LoginService.ZOSMF) {

                let zosmfHost: ZosmfHost = {
                    host: this.appConfig.security.zosmf.host,
                    port: this.appConfig.security.zosmf.port,
                    rejectUnauthorized: this.appConfig.security.zosmf.rejectUnauthorized,
                    protocol: this.appConfig.security.zosmf.protocol
                }
                // TODO: Do better on unwrapping creds; make a class instead of type? too much leakage
                loggedIn = await ZosmfLogin.loginUser(zosmfHost, principal.getUser().getMainframeUser(), principal.getCredentials().value)

            } else {
                throw new Error("Authentication service" + loginSection.authService.service + " not supported yet.")
            }

        } else {
            throw new Error("Login strategy type " + loginSection.strategy + " not supported yet.")
        }
        // extract credential
        if (loggedIn) {
            this.credentialProvider.exchangeCredential(principal.getUser(), principal.getCredentials().value)
            return this.userMap.mapUser(principal.getUser().getDistributedUser(), principal.getUser().getMainframeUser());
        } else {
            this.log.debug("Failed to login user " + principal.getUser().getMainframeUser())
            return false
        }

    }

    public logoutUser(user: ChatUser) {
        this.credentialProvider.logout(user)
        this.userMap.removeUser(user.getDistributedUser())
    }

    public isAuthenticated(chatUsr: IUser): boolean {
        let user = this.getChatUser(chatUsr);
        if (user === undefined) {
            this.log.debug("TBD001D: Could not find stored value for user: " + chatUsr + " Returning 'not authenticated'.");
            return false
        }
        return true
    }


    // TODO: what happens during failure conditions? retry?
    private writeConfig(): void {
        this.configManager.updateConfig(SecurityConfigSchema, this.securityConfig);
    }

    public getPrincipal(user: ChatUser): ChatPrincipal | undefined {

        let cred = this.credentialProvider.getCredential(user)
        if (cred == undefined || cred.value.length == 0) {
            return undefined
        }
        return new ChatPrincipal(
            user,
            cred
        );
    }

    // TODO: rename to getmainframeuser?
    public getChatUser(user: IUser): ChatUser | undefined {
        let uid: string = user.name
        let principal: string | undefined = this.userMap.getUser(uid);
        if (principal === undefined) {
            uid = user.email;
            principal = this.userMap.getUser(uid);
        }
        if (principal === undefined || principal.trim().length == 0) {
            this.log.debug("User not found in user map: " + user.name);
            return undefined;
        }
        return new ChatUser(uid, principal);
    }
}