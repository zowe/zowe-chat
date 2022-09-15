/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { AppConfigLoader } from "../../config/AppConfigLoader";
import { Logger } from "../../utils/Logger";
import { SecurityConfig, TokenService } from "../config/SecurityConfig";
import { ZosmfLogin } from "../login/ZosmfLogin";
import { ChatCredential, CredentialType } from "../user/ChatCredential";
import { ChatUser } from "../user/ChatUser";
import { ICredentialProvider } from "./ICredentialProvider";

export class TokenProvider implements ICredentialProvider {

    private readonly log: Logger;
    private readonly tokenCache: Map<string, ChatCredential>;
    private readonly authHost: string;
    private readonly authPort: number;
    private readonly tokenService: TokenService
    private readonly authProtocol: string;
    private readonly rejectUnauth: boolean;

    /*
    Set-Cookie: LtpaToken2=+nF4yYMIyE9y+nc3W2BhhEQ9cKzlcrFQzEyM dp4V31aBs+BgRpT+KwXAGotgM+RaIqrdBc/J+coCeEoZUdl4NThNndMsKTPpswNU65PDgdg/6HYKtssn8Rn8IGehxjTMbrF67L87pv3IkPFoG1jKGPZF3tIEZ3ZuAortJzv9WVYzFyEn2Vamq/XeTXfXxLTgBTkwm9a240G0HjFAkbXD/PF8sMHPSB2Cvf8J7Joggkl2f5bntlZ5Tgaro5hsIiml45DsTbKxNm4KYO6RhPD7XvtO4IuHz5Wd88GmaNlGa2wBeRQLiHR4XKk2SpVQHQOU7; Path=/; Secure; HttpOnly
    */

    constructor(config: SecurityConfig, log: Logger) {
        let appConfig = AppConfigLoader.loadAppConfig()
        this.authProtocol = appConfig.security.zosmf.protocol
        this.authPort = appConfig.security.zosmf.port
        this.authHost = appConfig.security.zosmf.host
        this.tokenService = TokenService.ZOSMF
        this.rejectUnauth = appConfig.security.zosmf.rejectUnauthorized
        this.log = log
        this.tokenCache = new Map<string, ChatCredential>()
    }

    private cacheKey(chatUser: ChatUser): string {
        return `${chatUser.getDistributedUser()}:${chatUser.getMainframeUser()}`
    }

    private retrieveCredential(chatUser: ChatUser): ChatCredential {
        return this.tokenCache.get(this.cacheKey(chatUser))
    }

    private storeCredential(chatUser: ChatUser, cred: ChatCredential): void {
        this.tokenCache.set(this.cacheKey(chatUser), cred)
    }

    public async exchangeCredential(chatUser: ChatUser, password: string): Promise<boolean> {
        let token: ChatCredential;
        switch (this.tokenService) {
            case TokenService.ZOSMF:
                token = await ZosmfLogin.getZosmfToken({ host: this.authHost, port: this.authPort, protocol: this.authProtocol, rejectUnauthorized: this.rejectUnauth }, chatUser.getMainframeUser(), password);
                if (token.type == CredentialType.UNDEFINED) {
                    return false
                }
                this.storeCredential(chatUser, token)
                break;
            // TODO: Implement APIML support in a future story
            //        case TokenService.ZOWE_V1
            //       case TokenService.ZOWE_V2
        }
        return true
    }

    public getCredential(chatUser: ChatUser): ChatCredential | undefined {

        try {
            let cred = this.retrieveCredential(chatUser)
            if (cred === undefined || cred.value.length == 0) {
                return {
                    type: CredentialType.UNDEFINED,
                    value: "",
                }
            }
            return cred
        } catch (err) {
            this.log.debug(err)
            return undefined
        }
    }

    public logout(chatUser: ChatUser) {
        //nothing required.
    }
}