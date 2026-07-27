module.exports = {
  extends: ["@med-check/eslint-config"],
  parserOptions: {
    project: null,
    sourceType: "script",
  },
  rules: {
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-var-requires": "off",
  },
  overrides: [
    {
      // Browser-side dashboard code — no Node globals, uses ES modules.
      files: ["public/**/*.js"],
      env: { browser: true, node: false },
      parserOptions: { sourceType: "module" },
    },
  ],
};
