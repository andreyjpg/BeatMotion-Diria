// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/ holds Deno Edge Functions and Node scripts with their own tooling.
    ignores: ['dist/*', 'supabase/**'],
  },
]);
