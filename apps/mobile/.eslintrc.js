module.exports = {
  extends: ["@med-check/eslint-config"],
  env: {
    browser: true,
  },
  rules: {
    "@typescript-eslint/no-require-imports": "off",
  },
  overrides: [
    {
      // Metro/Babel configs are CommonJS and must use require().
      files: ["metro.config.js", "babel.config.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
};
