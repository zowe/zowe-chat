/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import crypto from 'crypto';
import * as fs from 'fs-extra';
import { logger } from '../../utils/Logger';
import { SecurityConfig } from '../../types/SecurityConfig';
import { ChatCredential, CredentialType } from '../user/ChatCredential';
import { ChatUser } from '../user/ChatUser';
import { ICredentialProvider } from './ICredentialProvider';
import { Util } from '../../utils/Util';

export class PasswordProvider implements ICredentialProvider {
  private readonly encryptIv: Buffer;
  private readonly encryptKey: Buffer;
  private readonly encryptAlgorithm: string = 'aes-256-cbc';
  private readonly passFile: string;
  private readonly passCache: Map<string, string>;

  constructor(config: SecurityConfig, cryptIv: Buffer, cryptKey: Buffer) {
    this.encryptIv = cryptIv;
    this.encryptKey = cryptKey;

    this.passFile = config.passwordOptions.filePath;
    try {
      fs.ensureFileSync(this.passFile);
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Password provider create exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      logger.error(`Error creating password file: ${this.passFile}`);
      logger.debug(`Error details: ${error}`);
      throw Error('Unable to initialize the password provider. See Log for more details.');
    }
    const encryptedText = Buffer.from(fs.readFileSync(this.passFile).toString(), 'hex');
    const decipher = crypto.createDecipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
    this.passCache = new Map();
    if (encryptedText == null || encryptedText.length === 0) {
      this.writePassFile();
    } else {
      const jsonFormat: Object = JSON.parse(Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString());
      for (const [key, value] of Object.entries(jsonFormat)) {
        this.passCache.set(key, value);
      }
    }
    logger.info('Password provider initialized');
  }

  private writePassFile(): void {
    logger.debug('Writing to password file');
    const cipher = crypto.createCipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
    const encryptedOut = Buffer.concat([cipher.update(JSON.stringify(this.passCache)), cipher.final()]);
    fs.writeFileSync(this.passFile, encryptedOut.toString('hex'), { flag: 'w' });
  }

  public async exchangeCredential(chatUser: ChatUser, credential: string): Promise<boolean> {
    this.passCache.set(chatUser.getMainframeUser(), credential);
    this.writePassFile();
    return true;
  }

  public getCredential(chatUser: ChatUser): ChatCredential | undefined {
    if (this.passCache.get(chatUser.getMainframeUser()) == null) {
      return undefined;
    }
    return {
      type: CredentialType.PASSWORD,
      value: this.passCache.get(chatUser.getMainframeUser()),
    };
  }

  public logout(chatUser: ChatUser) {
    this.passCache.delete(chatUser.getMainframeUser());
    this.writePassFile();
  }
}
