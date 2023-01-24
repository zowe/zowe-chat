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

// Jest 'projects' specifications do not inherit global properties by default, so use an object to track these.
const commonProperties: Config = {
    moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx', 'json', 'node'],
    modulePathIgnorePatterns: [
        '.*?__tests__/__snapshots__/.*',
        '.*/dist/.*',
        '.*/node_modules/.*',
        '.*/lib/.*',
    ],
    preset: 'ts-jest',
    testRegex: '__tests__.*\\.*?\\.(spec|test)\\.ts$',
};

const config: Config = {
    ...commonProperties,
    coverageDirectory: '<rootDir>/__tests__/__results__/unit/coverage',
    coverageReporters: [
        'json',
        'lcov',
        'text',
        'cobertura',
    ],
    globals: {
        'ts-jest': {
            disableSourceMapSupport: true,
        },
    },

    projects: [
        {
            ...commonProperties,
            displayName: 'proj-root-tests',
            runner: 'jest-runner',
            testPathIgnorePatterns: ['<rootDir>/packages/.*'],
        },
        {
            ...commonProperties,
            displayName: 'chat-backend-server',
            rootDir: '<rootDir>/packages/chat',
        },
        {
            ...commonProperties,
            displayName: 'cli-commands-plugin',
            rootDir: '<rootDir>/packages/clicmd',
        },
        {
            ...commonProperties,
            displayName: 'zos-basic-commands-plugin',
            rootDir: '<rootDir>/packages/zos',
        },
        {
            ...commonProperties,
            displayName: 'webapp',
            rootDir: '<rootDir>/packages/webapp',
            moduleNameMapper: {
                '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
                  '<rootDir>/__tests__/__mocks__/fileMock.ts',
                '\\.(css|less)$': '<rootDir>/__tests__/__mocks__/styleMock.ts',
            },
            runner: 'jest-runner',
            setupFilesAfterEnv: [
                './__tests__/setupTests.ts',
            ],
            testEnvironment: 'jsdom',
            testRegex: '__tests__.*\\.*?\\.(spec|test)\\.tsx?$',
            transform: {
                '^.+\\.tsx?$': 'ts-jest',
            },
        },
    ],
    roots: [
        '<rootDir>',
    ],
    setupFilesAfterEnv: [
        './__tests__/beforeTests.ts',
    ],
    testEnvironment: 'node',

    testResultsProcessor: 'jest-sonar-reporter',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
};

export default config;
