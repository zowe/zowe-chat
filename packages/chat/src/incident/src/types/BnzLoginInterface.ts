/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {IMessage} from 'commonbot/types';
import {IQueryResult} from './BnzCommonInterface';

export interface ILoginSaveCredentialResult {
    commandOutput: IMessage[];
    queryResult: IQueryResult;
    loginSuccess: boolean;
    saveCredentialSuccess: boolean;
}

export interface IHandleLoginOptions {
    searchParams?: URLSearchParams;
    body?: Record<string, any>;
    queryHandler?: (searchParams: URLSearchParams, body?: Record<string, any>) => Promise<IQueryResult>;
    resourceName?: string;
    operatorParamMode?: 'body' | 'query';
    operationText?: string;
}
