/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

module.exports = {
    env: {
        browser: false,
        node: true,
        es6: true,
        jest: true,
    },
    plugins: ['node', 'prettier', 'header'],
    extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
    ignorePatterns: ['**/.build', '**/build', '**/dist', '**/node_modules', '**/release', '**/lib'],
    rules: {
        'header/header': [
            2,
            'block',
            [
                '\n * This program and the accompanying materials are made available under the terms of the' +
                    '\n * Eclipse Public License v2.0 which accompanies this distribution, and is available at' +
                    '\n * https://www.eclipse.org/legal/epl-v20.html' +
                    '\n *' +
                    '\n * SPDX-License-Identifier: EPL-2.0' +
                    '\n *' +
                    '\n * Copyright Contributors to the Zowe Project.' +
                    '\n ',
            ],
            2,
        ],
        'prettier/prettier': 'error',
        'block-scoped-var': 'error',
        eqeqeq: ['error', 'always', {null: 'ignore'}],
        'no-var': 'error',
        'prefer-const': 'error',
        'eol-last': 'error',
        'prefer-arrow-callback': 'error',
        'no-trailing-spaces': 'error',
        quotes: ['warn', 'single', {avoidEscape: true}],
        'no-restricted-properties': [
            'error',
            {
                object: 'describe',
                property: 'only',
            },
            {
                object: 'it',
                property: 'only',
            },
        ],
    },
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            parser: '@typescript-eslint/parser',
            extends: ['plugin:@typescript-eslint/recommended', 'google'],
            rules: {
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-use-before-define': 'off',
                '@typescript-eslint/no-warning-comments': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/camelcase': 'off',
                indent: ['error', 4, {SwitchCase: 1}],
                'max-len': [
                    'error',
                    {
                        code: 140,
                        comments: 160,
                        tabWidth: 4,
                        ignoreUrls: true,
                        ignoreTemplateLiterals: true,
                    },
                ],

                'node/no-missing-import': 'off',
                'node/no-empty-function': 'off',
                'node/no-unsupported-features/es-syntax': 'off',
                'node/no-missing-require': 'off',
                'node/shebang': 'off',
                'no-dupe-class-members': 'off',
                'require-atomic-updates': 'off',
                'require-jsdoc': [
                    'off',
                    {
                        require: {
                            FunctionDeclaration: true,
                            MethodDefinition: true,
                            ClassDeclaration: true,
                        },
                    },
                ],
                'valid-jsdoc': [
                    'off',
                    {
                        requireParamDescription: false,
                        requireReturnDescription: false,
                        requireReturn: false,
                        prefer: {returns: 'return'},
                    },
                ],
            },
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: 'module',
            },
        },
    ],
};
