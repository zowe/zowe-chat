/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import React from 'react';
import { IAuthContextType } from './IAuthContextType';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const AuthContext: React.Context<IAuthContextType> = React.createContext<IAuthContextType>(null!);
export function useAuth() {
  return React.useContext(AuthContext);
}
