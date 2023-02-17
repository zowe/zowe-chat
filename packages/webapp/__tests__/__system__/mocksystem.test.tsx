/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { sep } from 'path';

describe('jest executes integration test', () => {
    it('assert 1=1', async () => {
        expect(1).toBe(1);
        console.log('Test ' + sep + ' Complete');
    });
});
