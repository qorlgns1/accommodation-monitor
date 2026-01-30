// eslint.config.ts
import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // 무시할 파일/폴더
  globalIgnores(['.next/', 'out/', 'build/', 'dist/', 'node_modules/', '*.config.js', '*.config.mjs', 'next-env.d.ts']),

  // 기본 JS 규칙
  eslint.configs.recommended,

  // TypeScript 규칙
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,

  // React + Next.js 규칙
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin as unknown as Record<string, unknown>,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React
      ...reactPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Next.js
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',

      // console.log 허용
      'no-console': 'off',

      // 상위 폴더 상대경로 import 금지 (같은 폴더 ./는 허용)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: '상대경로 대신 절대경로(@/)를 사용하세요.',
            },
          ],
        },
      ],
    },
  },

  // Prettier 충돌 방지
  prettierConfig,
);
