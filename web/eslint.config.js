// Import boundaries from the build spec: app → features → components → design-system → core.
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'qa/out', 'test-results', 'playwright-report', 'core/logic/transliterate.ts'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries, 'react-hooks': reactHooks },
    settings: {
      'import/resolver': { typescript: true },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'components', pattern: 'src/components/*' },
        { type: 'ds', pattern: 'src/design-system/*' },
        { type: 'core', pattern: 'core/*' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'app', allow: ['app', 'feature', 'components', 'ds', 'core'] },
          { from: 'feature', allow: [['feature', { name: '${from.name}' }], 'components', 'ds', 'core'] },
          { from: 'components', allow: ['components', 'ds', 'core'] },
          { from: 'ds', allow: ['ds', 'core'] },
          { from: 'core', allow: ['core'] },
        ],
      }],
    },
  },
  {
    // core/ stays browser-free so a native app can reuse it.
    files: ['core/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'indexedDB'],
      'no-restricted-imports': ['error', { patterns: ['react-dom', '*.css'] }],
    },
  },
);
