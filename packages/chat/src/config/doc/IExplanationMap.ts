/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

export interface IExplanationMap {
    explainedParentKey: string;              // parent key name in case this is map for nested child JSON object
    ignoredKeys: string;                     // comma separated list of keys whose value will be ignored
    [key: string]: string | IExplanationMap; // all explained keys of JSON object at this level and 'link' to all nested JSON objects
    // which will be explained by their explanation maps
}