// eslint.config.js
import js from '@eslint/js'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import ts from 'typescript-eslint'

export default ts.config(
  { ignores: ['node_modules', 'dist', 'build', 'coverage', 'vite-env.d.ts', 'src/db/schema_old.ts'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parser: ts.parser,
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-constant-binary-expression': 'error'
    },
    settings: {
      react: { version: 'detect' },
    }
  }
)
