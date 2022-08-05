import { IChatContextData } from "@zowe/commonbot";
import * as crypto from "crypto";
import { UserConfigManager } from "../config/UserConfigManager";
import { Logger } from "../utils/Logger";
import { AuthenticationStrategy, SecurityConfig } from "./config/SecurityConfig";
import { SecurityConfigSchema } from "./config/SecurityConfigSchema";
import { IUserMapping } from "./mapping/IUserMapping";
import { UserFileMapping } from "./mapping/UserFileMapping";
import { ICredentialProvider } from "./providers/ICredentialProvider";
import { PassticketProvider } from "./providers/PassticketProvider";
import { ChatPrincipal } from "./user/ChatPrincipal";

export class SecurityFacility {

    // TODO: Do we need config manager and a ref to security config? Will we be reloading config dynamically?
    private readonly configManager: UserConfigManager;
    private readonly userMap: IUserMapping;
    private securityConfig: SecurityConfig;
    private readonly log: Logger;
    private credentialProvider: ICredentialProvider;

    constructor(configManager: UserConfigManager, log: Logger) {
        this.log.debug("Initializing security facility");
        this.configManager = configManager;
        this.log = log;

        this.securityConfig = this.configManager.getConfigFromSchema(SecurityConfigSchema);

        if (this.securityConfig.authenticationStrategy == AuthenticationStrategy.Passticket.toString()) {
            this.log.info("Using passtickets authentication strategy");
            this.credentialProvider = new PassticketProvider(this.securityConfig, this.log);
        }
        if (this.securityConfig.authenticationStrategy == AuthenticationStrategy.Password.toString()) {
            this.log.info("Using password authentication strategy");
            this.credentialProvider = new PassticketProvider(this.securityConfig, this.log);
        }

        let cryptKey: string = this.securityConfig.encryptionKey;
        if (cryptKey === undefined || cryptKey.trim().length == 0) {
            cryptKey = crypto.randomBytes(16).toString('hex');
        }

        // TODO: choose backing mapping service from configuration?
        this.userMap = new UserFileMapping(this.securityConfig.userStorage, cryptKey, this.log)

        this.log.debug("Security facility initialized");
    }

    public isAuthenticated(chatCtx: IChatContextData): boolean {
        let principal = this.getPrincipal(chatCtx.context.chatting.user.name);
        if (principal === undefined) {
            principal = this.getPrincipal(chatCtx.context.chatting.user.email);
        }
        if (principal === undefined) {
            this.log.debug("Could not find stored principal for user: " + chatCtx.context.chatting.user.name + " Will return 'not authenticated'");
            return false
        }
        return true
    }

    private persistUser(distributedId: string, mainframeId: string): boolean {
        return this.userMap.mapUser(distributedId, mainframeId);
    }

    public getPassword(principal: ChatPrincipal) {
        return this.credentialProvider.getCredential(principal);
    }

    public getPrincipal(userId: string): ChatPrincipal | undefined {
        let principal: string | undefined = this.userMap.getUser(userId);
        if (principal === undefined || principal.trim().length == 0) {
            this.log.debug("User not found in user map: " + userId);
            return undefined;
        }
        return new ChatPrincipal(userId, principal);
    }
}