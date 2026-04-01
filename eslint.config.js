const js = require('@eslint/js')
const eslintConfigPrettier = require('eslint-config-prettier')

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
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // 关闭可能与 Prettier 冲突的格式化规则，让 Prettier 专注排版，ESLint 专注代码质量。
  eslintConfigPrettier,
]
