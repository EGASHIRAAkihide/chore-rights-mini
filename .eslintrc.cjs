module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: ['next/core-web-vitals', 'plugin:import/recommended', 'plugin:import/typescript', 'prettier'],
  rules: {
    'import/order': [
      'error',
      {
        groups: [
          ['builtin', 'external'],
          ['internal'],
          ['parent', 'sibling', 'index', 'object'],
          ['type']
        ],
        pathGroups: [
          { pattern: 'next/**', group: 'external', position: 'before' },
          { pattern: 'react', group: 'external', position: 'before' },
          { pattern: '@chorerights/**', group: 'external', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'after' }
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ],
    'import/first': 'error',
    'import/newline-after-import': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@next/next/no-html-link-for-pages': 'off',
    'import/default': 'off'
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: [
          './tsconfig.base.json',
          './apps/web/tsconfig.json',
          './packages/lib/tsconfig.json',
          './packages/db/tsconfig.json'
        ]
      },
      node: true
    },
    react: {
      version: 'detect'
    }
  }
};
