/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

export class PluginRequireNotCreatedError extends Error {
  constructor() {
    super('Hooks have not been initialized. Please use `PluginRequireProvider.createPluginHooks(...)` first');
  }
}

export class PluginRequireAlreadyCreatedError extends Error {
  constructor() {
    super('Plugin requires have already been overridden. Cannot add a second hook!');
  }
}
