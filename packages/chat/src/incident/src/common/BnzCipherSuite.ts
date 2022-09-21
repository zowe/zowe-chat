/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import fs = require('fs');
import tls = require('tls');

import {ISecurityLevel, ITlsCipherSuite} from '../types/BnzCipherSuiteInterface';
import logger = require('../utils/logger');

class BnzCipherSuite {
    private static instance: BnzCipherSuite;
    private filePath: string;
    private cipherSuite: ITlsCipherSuite;

    private constructor() {
        if (BnzCipherSuite.instance === undefined) {
            // Set cipher suite file path
            this.filePath = `${__dirname}/../config/.cipher-suite.json`;

            // Read cipher suite file
            this.cipherSuite = this.readCipherSuiteFile();

            BnzCipherSuite.instance = this;
        }

        return BnzCipherSuite.instance;
    }

    // Get the singleton instance
    static getInstance(): BnzCipherSuite {
        if (BnzCipherSuite.instance === undefined) {
            BnzCipherSuite.instance = new BnzCipherSuite();
        }

        return BnzCipherSuite.instance;
    }

    // Read cipher suite file
    readCipherSuiteFile(): ITlsCipherSuite {
        // Initialize
        let cipherSuite: ITlsCipherSuite = {
            tls13: {
                recommended: [],
                secure: [],
                weak: [],
                insecure: [],
            },
            tls12: {
                recommended: [],
                secure: [],
                weak: [],
                insecure: [],
            },
        };

        // Read file
        try {
            if (fs.existsSync(this.filePath)) {
                const fileContent = fs.readFileSync(this.filePath, 'utf8');
                cipherSuite = JSON.parse(fileContent);
                logger.info(`Cipher suite: ${JSON.stringify(cipherSuite, null, 2)}`);
            } else {
                logger.error(`Cipher suite file ${this.filePath} does not exist!`);
            }

            return cipherSuite;
        } catch (error) {
            // Print exception stack
            logger.error(`Failed to read the cipher suite file ${this.filePath}`);
            logger.error(error);
            logger.error(error.stack);

            return cipherSuite;
        }
    }

    // Get cipher suite object
    getCipher(): ITlsCipherSuite {
        return this.cipherSuite;
    }

    // Get cipher per security level
    getCipherBySecurityLevel(securityLevel: ISecurityLevel): string[] {
        // Print start log
        logger.start(this.getCipherBySecurityLevel, this);
        logger.info(`security level: ${securityLevel}`);

        let cipherSuite: string[] = [];
        if (securityLevel === ISecurityLevel.RECOMMENDED_SECURE) {
            cipherSuite = this.cipherSuite.tls13.recommended.concat(this.cipherSuite.tls12.recommended)
                    .concat(this.cipherSuite.tls13.secure).concat(this.cipherSuite.tls12.secure);
        } else if (securityLevel === ISecurityLevel.RECOMMENDED) {
            cipherSuite = this.cipherSuite.tls13.recommended.concat(this.cipherSuite.tls12.recommended);
        } else if (securityLevel === ISecurityLevel.SECURE) {
            cipherSuite = this.cipherSuite.tls13.secure.concat(this.cipherSuite.tls12.secure);
        } else if (securityLevel === ISecurityLevel.WEAK) {
            cipherSuite = this.cipherSuite.tls13.weak.concat(this.cipherSuite.tls12.weak);
        } else if (securityLevel === ISecurityLevel.INSECURE) {
            cipherSuite = this.cipherSuite.tls13.insecure.concat(this.cipherSuite.tls12.insecure);
        } else if (securityLevel === ISecurityLevel.ANY) {
            cipherSuite = this.cipherSuite.tls13.recommended.concat(this.cipherSuite.tls12.recommended)
                    .concat(this.cipherSuite.tls13.secure).concat(this.cipherSuite.tls12.secure)
                    .concat(this.cipherSuite.tls13.weak).concat(this.cipherSuite.tls12.weak)
                    .concat(this.cipherSuite.tls13.insecure).concat(this.cipherSuite.tls12.insecure);
        } else {
            logger.error('Wrong security level!');
            cipherSuite = [];
        }

        // Print end log
        logger.end(this.getCipherBySecurityLevel, this);

        return cipherSuite;
    }

    // Get system secure cipher
    getSystemSecureCipher(): string[] {
        // Print start log
        logger.start(this.getSystemSecureCipher, this);

        // Print TLS versions
        logger.debug(`TLS DEFAULT_MAX_VERSION = ${tls.DEFAULT_MAX_VERSION}`);
        logger.debug(`TLS DEFAULT_MIN_VERSION = ${tls.DEFAULT_MIN_VERSION}`);
        logger.debug(`TLS DEFAULT_ECDH_CURVE = ${tls.DEFAULT_ECDH_CURVE}`);

        // Get system TLS cipher suites
        const systemCiphers = tls.getCiphers();
        logger.debug(`System available TLS ciphers: \n ${systemCiphers}`);

        // Get recommended, secure, weak, insecure ciphers for TLS v1.2 and v1.3
        // const recommendedCiphers: string [] = this.getCipherSuite(ISecurityLevel.RECOMMENDED);
        const secureCiphers: string [] = this.getCipherBySecurityLevel(ISecurityLevel.SECURE);
        const weakCiphers: string [] = this.getCipherBySecurityLevel(ISecurityLevel.WEAK);
        const insecureCiphers: string [] = this.getCipherBySecurityLevel(ISecurityLevel.INSECURE);

        // Find secure cipher suite
        let systemCipher = '';
        const results: string[] = [];
        for (const cipher of systemCiphers) {
            systemCipher = cipher.toUpperCase();

            // Check whether the cipher is weak and insecure or not
            if (!insecureCiphers.includes(systemCipher) && !weakCiphers.includes(systemCipher) && !secureCiphers.includes(systemCipher)) {
                results.push(systemCipher);
            }
        }
        logger.debug(`System secure TLS ciphers: ${results}`);

        // Print end log
        logger.end(this.getSystemSecureCipher, this);

        return results;
    }
}

const bnzCipherSuite = BnzCipherSuite.getInstance();
// Object.freeze(bnzCipherSuite);

export = bnzCipherSuite;
