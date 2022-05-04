/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

class User {
    private id: string;
    private name: string;
    private email: string;

    constructor(id: string = '', name: string = '', email: string = '') {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    set(user: User): void {
        this.id = user.id;
        this.name = user.name;
        this.email = user.email;
    }

    setId(id: string): void {
        this.id = id;
    }

    setName(name: string): void {
        this.name = name;
    }

    setEmail(email: string): void {
        this.email = email;
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getEmail(): string {
        return this.email;
    }
}

export = User;
