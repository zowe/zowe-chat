/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { config } from '../settings/Config';
import { IUser } from '@zowe/bot';
import * as crypto from 'crypto';
import { IAuthType } from '../types/IConfig';
import { UserConfigManager } from '../settings/UserConfigManager';
import { logger } from '../utils/Logger';
import { LoginService, LoginStrategyType, SecurityConfig } from '../types/SecurityConfig';
import { SecurityConfigSchema } from './SecurityConfigSchema';
import { ICredentialProvider } from './credentials/ICredentialProvider';
import { PasswordProvider } from './credentials/PasswordProvider';
import { TokenProvider } from './credentials/TokenProvider';
import { ZosmfHost, ZosmfLogin } from './login/ZosmfLogin';
import { IUserMapping } from './mapping/IUserMapping';
import { UserFileMapping } from './mapping/UserFileMapping';
import { ChatPrincipal } from './user/ChatPrincipal';
import { ChatUser } from './user/ChatUser';

export class SecurityManager {
  // TODO: Do we need config manager and a ref to security config? Will we be reloading config dynamically?
  private readonly configManager: UserConfigManager;
  private readonly userMap: IUserMapping;
  private securityConfig: SecurityConfig;
  private credentialProvider: ICredentialProvider;

  constructor(configManager: UserConfigManager) {
    this.configManager = configManager;

    logger.debug('Initializing security facility');
    try {
      this.securityConfig = this.configManager.getConfigFromSchema(SecurityConfigSchema);

      let cryptKey: Buffer = Buffer.from(this.securityConfig.encryptionKey, 'base64');
      if (cryptKey === undefined || cryptKey.length === 0) {
        cryptKey = crypto.randomBytes(32);
        this.securityConfig.encryptionKey = cryptKey.toString('base64');
      }
      let cryptIv: Buffer = Buffer.from(this.securityConfig.encryptionIv, 'base64');
      if (cryptIv === undefined || cryptIv.length === 0) {
        cryptIv = crypto.randomBytes(16);
        this.securityConfig.encryptionIv = cryptIv.toString('base64');
      }

      // TODO: choose backing mapping service from configuration?
      this.userMap = new UserFileMapping(this.securityConfig.userStorage, cryptKey, cryptIv);

      logger.info(`Using ${this.securityConfig.authenticationStrategy} authentication strategy`);
      const zosmfserverConfig = config.getZosmfServerConfig();
      switch (zosmfserverConfig.authType) {
        /* case AuthenticationStrategy.Passticket:
                    if (!process.arch.startsWith('s390')) {
                        logger.error("Passticket authentication is only supported when running on z/OS");
                        throw Error("Passticket authentication is only supported when running on z/OS");
                    }
                    this.credentialProvider = new PassticketProvider(this.securityConfig, this.log);
                    logger.debug("Using passticket provider for downstream authentications")
                    break;*/
        case IAuthType.PASSWORD:
          this.credentialProvider = new PasswordProvider(this.securityConfig, cryptIv, cryptKey);
          logger.debug('Using password provider for downstream authentications');
          break;
        case IAuthType.TOKEN:
          this.credentialProvider = new TokenProvider(this.securityConfig);
          logger.debug('Using zOSMF Token provider for downstream authentications');
          break;
        default:
          throw new Error('Unknown authentication strategy: ' + this.securityConfig.authenticationStrategy);
      }

      this.writeConfig();
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error('ZWECC001E: Internal server error: Security facility initialize exception');
      logger.error(logger.getErrorStack(new Error(error.name), error));
      throw error;
    }

    logger.debug('Security facility initialized');
  }

  public async authenticateUser(principal: ChatPrincipal): Promise<boolean> {
    // TODO: Write authentiction logic
    let loggedIn = false;
    const loginSection = this.securityConfig.loginStrategy;

    if (loginSection.strategy === LoginStrategyType.RequireLogin) {
      if (loginSection.authService.service === LoginService.ZOSMF) {
        const zosmfserverConfig = config.getZosmfServerConfig();
        const zosmfHost: ZosmfHost = {
          host: zosmfserverConfig.hostName,
          port: zosmfserverConfig.port,
          rejectUnauthorized: zosmfserverConfig.rejectUnauthorized,
          protocol: zosmfserverConfig.protocol,
        };
        // TODO: Do better on unwrapping creds; make a class instead of type? too much leakage
        loggedIn = await ZosmfLogin.loginUser(zosmfHost, principal.getUser().getMainframeUser(), principal.getCredentials().value);
      } else {
        throw new Error('Authentication service' + loginSection.authService.service + ' not supported yet.');
      }
    } else {
      throw new Error('Login strategy type ' + loginSection.strategy + ' not supported yet.');
    }
    // extract credential
    if (loggedIn) {
      this.credentialProvider.exchangeCredential(principal.getUser(), principal.getCredentials().value);
      return this.userMap.mapUser(principal.getUser().getDistributedUser(), principal.getUser().getMainframeUser());
    } else {
      logger.debug('Failed to login user ' + principal.getUser().getMainframeUser());
      return false;
    }
  }

  public logoutUser(user: ChatUser) {
    this.credentialProvider.logout(user);
    this.userMap.removeUser(user.getDistributedUser());
  }

  public isAuthenticated(chatUsr: IUser): boolean {
    const user = this.getChatUser(chatUsr);
    if (user === undefined) {
      logger.debug('TBD001D: Could not find stored value for user: ' + chatUsr + ` Returning 'not authenticated'.`);
      return false;
    }
    return true;
  }

  // TODO: what happens during failure conditions? retry?
  private writeConfig(): void {
    this.configManager.updateConfig(SecurityConfigSchema, this.securityConfig);
  }

  public getPrincipal(user: ChatUser): ChatPrincipal | undefined {
    const cred = this.credentialProvider.getCredential(user);
    if (cred == null || cred.value.length === 0) {
      return undefined;
    }
    return new ChatPrincipal(user, cred);
  }

  // TODO: rename to getmainframeuser?
  public getChatUser(user: IUser): ChatUser | undefined {
    let uid: string = user.name;
    let principal: string | undefined = this.userMap.getUser(uid);
    if (principal == null) {
      uid = user.email;
      principal = this.userMap.getUser(uid);
    }
    if (principal == null || principal.trim().length === 0) {
      logger.debug('User not found in user map: ' + user.name);
      return undefined;
    }
    return new ChatUser(uid, principal);
  }
}
