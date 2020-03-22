module.exports = {
  ignorePatterns: ["temp.js", "node_modules/", "generated/"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: `./tsconfig.json`
  },
  plugins: ["@typescript-eslint", "eslint-plugin-prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "eslint-config-prettier"
  ],
  rules: {
    "prettier/prettier": "warn",
    "no-undef": 0,
    "id-length": [
      "error",
      { min: 3, properties: "never", exceptions: ["_", "id", "x", "y"] }
    ],
    "@typescript-eslint/indent": 0,
    "@typescript-eslint/explicit-function-return-type": 0,
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/no-parameter-properties": 0,
    "@typescript-eslint/no-unused-vars": [
      "error",
      { varsIgnorePattern: "_.*" }
    ],
    "@typescript-eslint/array-type": [
      "error",
      {
        default: "array-simple"
      }
    ],
    "@typescript-eslint/ban-ts-ignore": ["error"],
    // "@typescript-eslint/no-floating-promises": ["error"],
    "@typescript-eslint/no-inferrable-types": ["error"],
    "@typescript-eslint/no-magic-numbers": 0,
    "@typescript-eslint/no-this-alias": ["error"]
    // "@typescript-eslint/prefer-string-starts-ends-with": ["error"],
    // "@typescript-eslint/promise-function-async": ["error"]
    // "@typescript-eslint/require-await": ["error"]
  },
  settings: {
    react: {
      version: "latest"
    }
  }
};
