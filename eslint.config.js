import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  {
    files: ['*.rules'],
    languageOptions: {
      parser: firebaseRulesPlugin.parsers.firestore,
    },
    plugins: {
      '@firebase/security-rules': firebaseRulesPlugin,
    },
    rules: {
      ...firebaseRulesPlugin.configs.recommended.rules,
    },
  },
];
