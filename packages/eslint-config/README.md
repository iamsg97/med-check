# @med-check/eslint-config

Shared ESLint configuration for all packages in the MedCheck monorepo.

## Usage

In any package's `.eslintrc.js`:

```js
module.exports = {
  extends: ["@med-check/eslint-config"],
  // package-specific overrides
};
```
