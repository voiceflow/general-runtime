module.exports = {
  extends: ['@voiceflow/eslint-config', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts'],
      extends: ['@voiceflow/eslint-config/typescript'],
    },
  ],
  rules: {
    'import/no-cycle': 'off',
    'no-param-reassign': 'warn',
  },
};
