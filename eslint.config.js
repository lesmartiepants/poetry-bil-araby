import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', '*.config.js', 'design-review/'],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // React plugin (flat config)
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],

  // React Hooks (flat config format)
  reactHooks.configs.flat['recommended-latest'],

  // Prettier — disables conflicting formatting rules (must be last plugin config)
  prettierConfig,

  // Project-specific overrides — include .jsx files explicitly
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Downgrade rules that would create too much noise on the existing codebase
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/prop-types': 'off', // No PropTypes in this project
      'react/no-unescaped-entities': 'warn',
      'react/display-name': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],

      // react-hooks v7 new rules — downgrade to warn for existing codebase
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },

  // Test files — add Node/test globals
  {
    files: ['src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        test: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
];
