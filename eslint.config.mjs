import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores
    "node_modules/**",
    "*.config.*",
    "scripts/**",
    "whatsapp-bridge/**",
  ]),
  // Disable React Compiler plugin completely
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      // React Compiler - DISABLE COMPLETELY
      "react-compiler/react-compiler": "off",
    },
  },
  // Custom rules for production build - all non-critical as warnings
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",

      // React rules - hooks must be errors (safety-critical)
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "warn",
      "react/prop-types": "off",
      "react/display-name": "warn",

      // Next.js rules - downgrade to warnings
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-assign-module-variable": "warn",

      // General rules - off or warn
      "no-console": "off",
      "no-unused-vars": "off",
      "prefer-const": "warn",
      "no-var": "warn",

      // React Hooks compiler safety rules as warnings while legacy modules are migrated
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
