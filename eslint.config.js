// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/ holds Deno Edge Functions and Node scripts with their own tooling.
    ignores: ['dist/*', '.expo/*', 'supabase/**'],
  },
  {
    // eslint-config-expo 57 enables the React Compiler rules as errors. Existing
    // screens predate them (mostly setState inside useEffect), so they stay
    // visible as warnings and get fixed as each screen is reworked.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // Project style: declare with const (let only when it's reassigned).
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Type everything. A warning until the remaining older screens are typed.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
