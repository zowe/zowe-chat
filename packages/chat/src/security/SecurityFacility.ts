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
import { PasswordProvider } from "./providers/PasswordProvider";
import { ChatPrincipal } from "./user/ChatPrincipal";

export class SecurityFacility {

    // TODO: Do we need config manager and a ref to security config? Will we be reloading config dynamically?
    private readonly configManager: UserConfigManager;
    private readonly userMap: IUserMapping;
    private readonly log: Logger;
    private securityConfig: SecurityConfig;
    private credentialProvider: ICredentialProvider;

    constructor(configManager: UserConfigManager, log: Logger) {
        this.log = log;
        this.configManager = configManager;
        this.log.debug("Initializing security facility");
        this.securityConfig = this.configManager.getConfigFromSchema(SecurityConfigSchema);

        if (this.securityConfig.authenticationStrategy == AuthenticationStrategy.Passticket.toString()) {
            // TODO: Can we startup with broken authentication so users can change it @ runtime? Fail fast @ startup is fine for now.
            if (!process.arch.startsWith('s390')) {
                this.log.error("Passticket authentication is only supported on z/OS");
                throw Error("Passticket authentication is only supported on z/OS");
            }
            this.log.info("Using passtickets authentication strategy");
            this.credentialProvider = new PassticketProvider(this.securityConfig, this.log);
        }
        if (this.securityConfig.authenticationStrategy == AuthenticationStrategy.Password.toString()) {
            this.log.info("Using password authentication strategy");
            this.credentialProvider = new PasswordProvider(this.securityConfig, this.log);
        }

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
        this.writeConfig()
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

    // TODO: return a boolean? what happens during failure conditions? retry?
    private writeConfig(): void {
        this.configManager.updateConfig(SecurityConfigSchema, this.securityConfig);
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