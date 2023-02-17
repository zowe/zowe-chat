/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

export class ChatUser {
  private readonly mainframeUser: string;
  private readonly distributedUser: string;

  constructor(originalUser: string, mappedUser: string) {
    this.distributedUser = originalUser;
    this.mainframeUser = mappedUser;
  }

  public getDistributedUser(): string {
    return this.distributedUser;
  }

  public getMainframeUser(): string {
    return this.mainframeUser;
  }
}
