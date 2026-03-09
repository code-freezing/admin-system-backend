const js = require('@eslint/js')
const prettierPlugin = require('eslint-plugin-prettier')

module.exports = [
  {
    ignores: ['node_modules/**', 'public/upload/**'],
  },
  js.configs.recommended,
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
      'prettier/prettier': 'warn',
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
]
