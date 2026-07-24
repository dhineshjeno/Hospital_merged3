// eslint.config.js — flat config for ESLint 9/10.
// Replaces the legacy .eslintrc.json (which ESLint 9+ ignores). Keeps the same
// intent: catch real bugs (unused vars, undefined names) without noise.
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly', console: 'readonly', require: 'readonly',
        module: 'writable', __dirname: 'readonly', Buffer: 'readonly',
        setTimeout: 'readonly', setInterval: 'readonly', clearTimeout: 'readonly',
        // jest globals for the test files
        describe: 'readonly', test: 'readonly', expect: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
    },
  },
  { ignores: ['node_modules/**', 'frontend/**', 'hospital-frontend/**', 'src/**/*.backup'] },
];