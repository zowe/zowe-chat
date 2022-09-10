/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IResource} from '../types';

import type {TFunction} from 'i18next';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import Logger = require('../utils/Logger');

const logger = Logger.getInstance();

class ChatResource {
    private resources: IResource[];

    constructor() {
        this.resources = [];
    }

    // Add resource
    addResource(resource: IResource[]): void {
        this.resources = this.resources.concat(resource);
    }

    // Initialize translation resources for Zowe Chat and plugins
    async initialize(): Promise<void> {
        // Print start log
        logger.start(this.initialize, this);
        try {
            logger.debug(`Translation resources: ${JSON.stringify(this.resources, null, 4)}`);
            // Get namespace and load path
            const namespaces: string[] = [];
            const loadPaths: string[] = [];
            for (const res of this.resources) {
                namespaces.push(res.namespace);
                loadPaths.push(res.loadPath);
            }

            // Initialize translation resource with fs backend
            await i18next.use(Backend).init({
                debug: false,
                initImmediate: false,
                fallbackLng: 'en_US',
                lng: 'en_US', // TBD: get the preferred language from configuration
                preload: ['en_US'],
                load: 'languageOnly',
                ns: namespaces,
                defaultNS: 'ChatMessage',
                backend: {
                    loadPath: (lng: string, ns: string) => {
                        const index = namespaces.indexOf(ns);
                        if (index !== -1) {
                            return loadPaths[index];
                        } else {
                            logger.error(`Can't find the translation namespace ${ns}. Please double check your translation resources!`);
                        }
                    },
                },
            },
            (error: any, t: TFunction) => { // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                if (error) {
                    logger.error(`Failed to load translation resources!\n ${JSON.stringify(error, null, 4)}`);
                }
            });
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.initialize, this);
        }
    }
}

export = ChatResource;
