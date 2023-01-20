/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import type { Config } from 'jest';

const config: Config = {
    coverageDirectory: '<rootDir>/__tests__/__results__/unit/coverage',
    coverageReporters: [
        'json',
        'lcov',
        'text',
        'cobertura',
    ],
    moduleFileExtensions: ['ts', 'js', 'tsx'],
    modulePathIgnorePatterns: [
        '__tests__/__snapshots__/',
        '.*/node_modules/.*',
        '.*/lib/.*',
    ],
    preset: 'ts-jest',
    projects: [
        {
            displayName: 'proj-root-tests',
            runner: 'jest-runner',
            testPathIgnorePatterns: ['<rootDir>/packages/.*'],
        },
        '<rootDir>/packages/chat',
        '<rootDir>/packages/clicmd',
        '<rootDir>/packages/zos',
        {
            displayName: 'webapp',
            runner: 'jest-runner',
            rootDir: '<rootDir>/packages/webapp',
        },
    ],
    roots: [
        '<rootDir>',
    ],
    setupFilesAfterEnv: [
        './__tests__/beforeTests.ts',
    ],
    testEnvironment: 'node',
    testRegex: '__tests__.*\\.*?\\.(spec|test)\\.ts$',
    testResultsProcessor: 'jest-sonar-reporter',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
};

export default config;
