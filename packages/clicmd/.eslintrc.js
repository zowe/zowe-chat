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
    'env': {
        'browser': false,
        'node': true,
        'es6': true,
        'jest': true,
    },
    'parser': '@typescript-eslint/parser',
    'plugins': [
        '@typescript-eslint',
        'header',
    ],
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'google',
    ],
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly',
    },
    'parserOptions': {
        'ecmaVersion': 11,
        'sourceType': 'module',
    },
    'ignorePatterns': ['**/dist', '**/node_modules', '**/release', '**/lib'],
    'rules': {
        'header/header': [2,
            'block',
            ['\n* This program and the accompanying materials are made available under the terms of the'
            + '\n* Eclipse Public License v2.0 which accompanies this distribution, and is available at'
            + '\n* https://www.eclipse.org/legal/epl-v20.html'
            + '\n*'
            + '\n* SPDX-License-Identifier: EPL-2.0'
            + '\n*'
            + '\n* Copyright Contributors to the Zowe Project.\n'],
            2
        ],
        'indent': [
            'error', 4, {
                'CallExpression': {
                    'arguments': 2,
                },
                'FunctionDeclaration': {
                    'body': 1,
                    'parameters': 2,
                },
                'FunctionExpression': {
                    'body': 1,
                    'parameters': 2,
                },
                'MemberExpression': 2,
                'ObjectExpression': 1,
                'SwitchCase': 1,
                'ignoredNodes': [
                    'ConditionalExpression',
                ],
            },
        ],
        'max-len': ['error', {
            code: 160,
            tabWidth: 2,
            ignoreUrls: true,
            ignorePattern: 'goog\.(module|require)',
        }],
        'object-curly-spacing': ['error', 'always'],
        'operator-linebreak': ['error', 'before'],
        'require-jsdoc': ['off', {
            require: {
                FunctionDeclaration: true,
                MethodDefinition: true,
                ClassDeclaration: true,
            },
        }],
        'valid-jsdoc': ['off', {
            requireParamDescription: false,
            requireReturnDescription: false,
            requireReturn: false,
            prefer: {returns: 'return'},
        }],
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
    },
};
