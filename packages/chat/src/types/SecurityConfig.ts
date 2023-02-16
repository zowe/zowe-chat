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
  loginStrategy: LoginStrategy;
  authenticationStrategy: AuthenticationStrategy;
  chatbotUser: string;
  passticketOptions?: PassticketOptions;
  passwordOptions?: PasswordOptions;
  tokenOptions?: TokenOptions;
};

export type LoginStrategy = {
  strategy: LoginStrategyType;
  authService: LoginProvider;
};

export type LoginProvider = {
  service: LoginService;
  protocol: string;
  host: string;
  port: number;
  rejectUnauthorized?: boolean;
};

export enum LoginService {
  ZOSMF = 'zosmf',
  // SAF = "saf", // only works on z/os?
  //  ZOWE_V1 = "zowe_v1"
  //  ZOWE_V2 = "zowe_v2"
}

export enum LoginStrategyType {
  RequireLogin = 'require-login',
  AutoLogin = 'auto-login',
}

export enum AuthenticationStrategy {
  Passticket = 'passticket',
  Password = 'password',
  Token = 'token',
}

export type PassticketOptions = {
  applId: string;
  replay_protection: boolean;
};

export type PasswordOptions = {
  filePath: string;
};

// TODO: may expand on this later, otherwise flatten it
export type TokenOptions = {
  tokenProvider: TokenProvider;
};

export type TokenProvider = {
  service: TokenService;
  protocol: string;
  host: string;
  port: number;
  rejectUnauthorized?: boolean;
};

export enum TokenService {
  ZOSMF = 'zosmf',
  // ZOWE_APIML_V1 = "zowe_v1",    TODO: implementation
  // ZOWE_APIML_V2 = "zowe_v2"     TODO: implementation
}
