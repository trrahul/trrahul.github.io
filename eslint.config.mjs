import js from '@eslint/js';
import globals from 'globals';

const recommended = js.configs.recommended;

export default [
  {
    ignores: [
      '_site/**',
      'Applications/**',
      'assets/js/data/**',
      'node_modules/**'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ...recommended.languageOptions,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      ...recommended.rules,
      'curly': ['error', 'multi-line', 'consistent'],
      'eqeqeq': ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-implicit-coercion': 'warn',
      'no-multi-spaces': 'error',
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-var': 'error',
      'object-shorthand': ['warn', 'always'],
      'prefer-const': ['error', { destructuring: 'all', ignoreReadBeforeAssign: true }],
      'prefer-template': 'warn'
    }
  },
  {
    files: ['assets/js/terminal-home/**/*.js'],
    rules: {
      'complexity': ['warn', { max: 15 }],
      'consistent-return': 'warn',
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 4],
      'no-duplicate-imports': 'error'
    }
  }
];
