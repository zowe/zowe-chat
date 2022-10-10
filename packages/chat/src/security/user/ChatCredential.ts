/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/


// ChatCredential to disambiguate from internal node Credential type
export type ChatCredential = {
    type: CredentialType;
    value: string;
};

export enum CredentialType {
    TOKEN_LTPA = "token_ltpa",
    TOKEN_JWT = "token_jwt",
    TOKEN_APIML = "token_apiml",
    PASSWORD = "password",
    PASSTICKET = "passticket",
    UNDEFINED = "na"
}