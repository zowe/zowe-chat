/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IConfigBlockDefinition } from '../types/IChatConfigSchema';
import { AuthenticationStrategy, LoginStrategyType, TokenService } from '../types/SecurityConfig';

export const SecurityConfigSchema: IConfigBlockDefinition = {
  key: 'chatbot-security',
  title: 'Default Security Provider Configuration',
  description: 'Out-of-the-box security configuration options for Zowe ChatBot',
  type: 'object',
  properties: {
    userStorage: {
      type: 'string',
      description: 'The path where ChatBot will store a list of authenticated users and their Chat Client IDs',
      default: './data/users.json',
    },
    encryptionKey: {
      type: 'string',
      description: 'The key used to encrypt secure information, using symmetric key encryption. Leave blank to generate a random key.',
      default: '',
    },
    encryptionIv: {
      type: 'string',
      description: 'The initialization vector used to encrypt secure information using. Leave blank to generate a random IV.',
      default: '',
    },
    loginStrategy: {
      type: 'object',
      description: 'Initial login requirements for users who wish to use Zowe ChatBot',
      properties: {
        strategy: {
          type: 'string',
          description: 'Require users to login',
          options: [
            {
              description:
                'Requires all users to login to the Zowe ChatBot framework and map their mainframe account to a Chat Application account',
              value: LoginStrategyType.RequireLogin.toString(),
            },
            {
              description: 'All users are automatically mapped to a Chat Service account',
              value: LoginStrategyType.AutoLogin.toString(),
            },
          ],
          default: LoginStrategyType.RequireLogin.toString(),
          onChange: (oldValue: string, newValue: string): boolean => {
            // TODO: ES2017 removes the need for this cast to string. Review tslint/compiler target
            if (Object.values<string>(LoginStrategyType).includes(newValue)) {
              return true;
            } else {
              return false;
            }
          },
        },
        authService: {
          type: 'object',
          description: 'Token provider information',
          properties: {
            service: {
              type: 'string',
              description: 'The token identity provider.',
              options: [
                {
                  value: TokenService.ZOSMF,
                  description: 'z/OSMF',
                },
              ],
              default: TokenService.ZOSMF,
            },
            host: {
              type: 'string',
              description: 'hostname of the token provider',
            },
            port: {
              type: 'number',
              description: 'port of the identity provider',
            },
            protocol: {
              type: 'string',
              description: 'protocl of the authentication service',
            },
            rejectUnauthorized: {
              type: 'boolean',
              description: 'use https',
              default: true,
            },
          },
        },
      },
    },
    authenticationStrategy: {
      type: 'string',
      description: 'The authentication strategy used for downstream API services such as z/OSMF',
      options: [
        {
          value: AuthenticationStrategy.Passticket,
          description: 'Generates passtickets per user for use with downstream API services',
        },
        {
          value: AuthenticationStrategy.Password,
          description: 'Encrypts and stores user passwords for use with downstream API services',
        },
        {
          value: AuthenticationStrategy.Token,
          description:
            'Caches tokens per user for use with downstream API services. Tokens typically expire within hours, at which time Zowe ChatBot will prompt users for another login.',
        },
      ],
      default: AuthenticationStrategy.Token,
    },
    chatbotUser: {
      type: 'string',
      description: 'The Chat Service account used for the Chat Bot, depending on configuration.',
      default: 'ZWECHAT',
    },
    passticketOptions: {
      type: 'object',
      description: 'Passticket Configuration Options',
      properties: {
        applId: {
          type: 'string',
          description: 'The application ID for the passticket',
          default: 'ZWECHATP',
        },
        replay_protection: {
          type: 'boolean',
          description: 'Generates a new passticket for every user API request.',
          default: false,
        },
      },
    },
    passwordOptions: {
      type: 'object',
      description: 'Password Configuration Options',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path to the file where user passwords are stored',
          default: './_config/crypt_p',
        },
      },
    },
    tokenOptions: {
      type: 'object',
      description: 'Token-based Authentication configuration options',
      properties: {
        tokenProvider: {
          type: 'object',
          description: 'Token provider information',
          properties: {
            service: {
              type: 'string',
              description: 'The token identity provider.',
              options: [
                {
                  value: TokenService.ZOSMF,
                  description: 'z/OSMF',
                },
              ],
              default: TokenService.ZOSMF,
            },
            host: {
              type: 'string',
              description: 'hostname of the token provider',
            },
            port: {
              type: 'number',
              description: 'port of the identity provider',
            },
            secure: {
              type: 'boolean',
              description: 'use https',
              default: true,
            },
          },
        },
      },
    },
  },
};
