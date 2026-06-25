import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

// Flat ESLint config. The key architectural rule the linter enforces is the
// Clean Architecture boundary: `domain` and `application` must not import
// Electron or Node platform modules (PRD §24, §29).
//
// Type-aware linting (projectService) is scoped to `src/**`, whose files belong
// to the layered tsconfig projects. Scripts and config files are linted with the
// syntactic ruleset only, so they don't need to live in a tsconfig project.
const platformRestricted = {
  files: ["src/domain/**/*.ts", "src/application/**/*.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "electron", message: "domain/application must stay platform-agnostic." },
          {
            name: "better-sqlite3",
            message: "Database access belongs in src/main/infrastructure.",
          },
          { name: "electron-store", message: "Config access belongs in src/main." },
          { name: "electron-log", message: "Logging belongs in src/main." },
        ],
        patterns: [
          { group: ["node:*"], message: "domain/application must not depend on Node builtins." },
          {
            group: ["@main/*", "../main/*", "../../main/*"],
            message: "Inner layers must not import outer layers.",
          },
        ],
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", ".beads/**", "release/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    ...react.configs.flat.recommended,
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
  },
  platformRestricted,
  {
    files: ["scripts/**/*.ts", "tests/**/*.{ts,tsx}", "**/*.config.{ts,js}", "eslint.config.js"],
    rules: {
      "no-console": "off",
    },
  },
  prettier,
);
