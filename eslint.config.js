import prettier from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error',
    },
  },
];
