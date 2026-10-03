/* eslint-disable import/no-named-as-default-member */

import eslintJs from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import * as pluginPackageJson from 'eslint-plugin-package-json';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import * as jsoncEslintParser from 'jsonc-eslint-parser';
import typescriptEslint from 'typescript-eslint';

const config = () =>
    typescriptEslint.config(
        {
            ignores: ['**/dist/**', '**/node_modules/**', '**/out/**'],
        },
        {
            linterOptions: { noInlineConfig: false, reportUnusedDisableDirectives: true },
        },
        eslintJs.configs.recommended,
        pluginImport.flatConfigs.recommended,
        pluginImport.flatConfigs.typescript,
        pluginPrettierRecommended,
        ...typescriptEslint.configs.strict,
        ...typescriptEslint.configs.stylistic,
        {
            rules: {
                'array-callback-return': 'error',
                curly: 'error',
                'no-else-return': 'error',
                'no-loop-func': 'error',
                'no-multi-assign': 'error',
                'no-param-reassign': 'error',
                'no-unneeded-ternary': 'error',
                'prefer-arrow-callback': 'error',
                'prefer-const': 'error',
                'prefer-object-spread': 'error',
                'prefer-template': 'error',

                '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
                ],

                'import/order': [
                    'error',
                    {
                        alphabetize: { caseInsensitive: true, order: 'asc', orderImportKind: 'asc' },
                        groups: ['builtin', 'external', 'internal', 'unknown', 'parent', 'sibling', 'index', 'object'],
                        named: true,
                        'newlines-between': 'always',
                        warnOnUnassignedImports: true,
                    },
                ],
            },
            settings: {
                'import/resolver': { typescript: { alwaysTryTypes: true, project: 'tsconfig*json' } },
            },
        },
        ...typeInformationConfig,
        ...packageJsonConfig,
    );

const typeInformationConfig = typescriptEslint.config({
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
        parser: typescriptEslint.parser,
        parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/dot-notation': 'error',
    },
});

const packageJsonConfig = typescriptEslint.config({
    files: ['**/package.json'],
    languageOptions: { parser: jsoncEslintParser },
    plugins: { 'package-json': pluginPackageJson },
    rules: pluginPackageJson.configs.recommended.rules,
});

export default config();
