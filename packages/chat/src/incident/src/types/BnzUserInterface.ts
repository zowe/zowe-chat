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
export const enum IUserStatus {
    OPEN = 'OPEN',
    EXPIRED = 'EXPIRED',
    LOCKED = 'LOCKED'
}

export const enum IUserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
    INTEGRATOR = 'INTEGRATOR'
}
/* eslint-enable no-unused-vars */

export interface IUser {
    name: string,
    password: string,
    salt: string,
    tokenValidTimePeriod: number,
    status: IUserStatus,
    role: IUserRole,
    createdDate: string,
    modifiedDate: string,
    lockedDate: string,
    expiredDate: string
}
