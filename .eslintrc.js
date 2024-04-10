module.exports = {
  extends: ['@voiceflow/eslint-config'],
  overrides: [
    {
      files: ['*.ts'],
      extends: ['@voiceflow/eslint-config/typescript'],
    },
  ],
  rules: {
    'import/no-cycle': 'off',
    'no-param-reassign': 'warn',
    'max-len': [
      'error',
      {
        code: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
  },
};
