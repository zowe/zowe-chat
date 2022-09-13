/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { ZosmfRestClient } from "@zowe/core-for-zowe-sdk";
import { ProfileInfo } from "@zowe/imperative";
import { ChatCredential, CredentialType } from "../user/ChatCredential";

// TODO: Add Login
export class ZosmfLogin {

    public static async loginUser(zosmfSpec: ZosmfHost, mfUser: string, mfPassword: string): Promise<boolean> {
        let zosmfSession = ProfileInfo.createSession(
            [{
                "argName": "port", "dataType": "number", "argValue": zosmfSpec.port, "argLoc": { "locType": 2 }, "secure": false
            },
            {
                "argName": "host", "dataType": "string", "argValue": zosmfSpec.host, "argLoc": { "locType": 2, }, "secure": false
            },
            {
                "argName": "protocol", "dataType": "string", "argValue": zosmfSpec.protocol, "argLoc": { "locType": 2, }, "secure": false
            },
            {
                "argName": "rejectUnauthorized", "dataType": "boolean", "argValue": zosmfSpec.rejectUnauthorized, "argLoc": { "locType": 2, }, "secure": false
            },
            {
                "argName": "user", "dataType": "string", "argLoc": { "locType": 2, }, "secure": false, "argValue": mfUser
            },
            {
                "argName": "password", "dataType": "string", "argLoc": { "locType": 2, }, "secure": false, "argValue": mfPassword
            },
            {
                "argName": "type", "dataType": "string", "argLoc": { "locType": 2, }, "secure": false, "argValue": "basic"
            }]
            , { autoStore: false, requestToken: false });

        let client = new ZosmfRestClient(zosmfSession)
        try {
            await client.request({
                request: "GET",
                resource: "/zosmf/restjobs/jobs"
            })
        } catch (error) {
            if (client.response.statusCode === 401 || client.response.statusCode == 403) {
                return false
            }
        }
        return true
    }


    public static async getZosmfToken(zosmfSpec: ZosmfHost, mfUser: string, mfPassword: string): Promise<ChatCredential> {
        let zosmfSession = ProfileInfo.createSession(
            [{
                "argName": "port", "dataType": "number", "argValue": zosmfSpec.port, "argLoc": { "locType": 2 }, "secure": false
            },
            {
                "argName": "host", "dataType": "string", "argValue": zosmfSpec.host, "argLoc": { "locType": 2, }, "secure": false
            },
            {
                "argName": "protocol", "dataType": "string", "argValue": zosmfSpec.protocol, "argLoc": { "locType": 2, }, "secure": false
            },
            {
                "argName": "rejectUnauthorized", "dataType": "boolean", "argValue": zosmfSpec.rejectUnauthorized, "argLoc": { "locType": 2, }, "secure": false
            },
            {
                "argName": "user", "dataType": "string", "argLoc": { "locType": 2, }, "secure": false, "argValue": mfUser
            },
            {
                "argName": "password", "dataType": "string", "argLoc": { "locType": 2, }, "secure": false, "argValue": mfPassword
            },
            {
                "argName": "type", "dataType": "string", "argLoc": { "locType": 2, }, "secure": false, "argValue": "basic"
            }]
            , { autoStore: false, requestToken: false });

        let client = new ZosmfRestClient(zosmfSession)

        try {
            await client.request({
                request: "GET",
                resource: "/zosmf/restjobs/jobs"
            })
        } catch (error) {
            console.log(error)
            if (client.response.statusCode === 401 || client.response.statusCode == 403) {
                return {
                    type: CredentialType.UNDEFINED,
                    value: "",
                }
            }
        }
        console.log(JSON.stringify(client.response))
        return {
            type: CredentialType.TOKEN_LTPA,
            value: client.response["Set-Cookie"]
        }
    }
}

export type ZosmfHost = {
    host: string,
    port: number,
    protocol: string,
    rejectUnauthorized: boolean
}