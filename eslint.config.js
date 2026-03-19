const js = require('@eslint/js')
const prettierPlugin = require('eslint-plugin-prettier')

module.exports = [
  // 忽略第三方依赖和上传目录，避免无意义扫描。
  {
    ignores: ['node_modules/**', 'public/upload/**'],
  },

  // 启用 ESLint 官方推荐规则集。
  js.configs.recommended,

  // 项目级 JavaScript 规则。
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // 仅把 Prettier 结果作为警告，避免阻断开发流程。
      'prettier/prettier': 'warn',
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
]
