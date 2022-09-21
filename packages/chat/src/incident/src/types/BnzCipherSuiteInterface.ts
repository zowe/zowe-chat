/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

/* eslint-disable no-unused-vars */
export const enum ISecurityLevel {
    ANY = 'any',
    RECOMMENDED_SECURE = 'recommended_secure',
    RECOMMENDED = 'recommended',
    SECURE = 'secure',
    WEAK = 'weak',
    INSECURE = 'insecure'
}
/* eslint-enable no-unused-vars */

export interface ITlsCipherSuite {
    tls13: ICipherSuite,
    tls12: ICipherSuite
}

export interface ICipherSuite {
    recommended: string[],
    secure: string[],
    weak: string[],
    insecure: string[]
}
