// Global Vitest setup: registers @testing-library/jest-dom matchers (toBeInTheDocument,
// toHaveTextContent, …) and auto-cleans the DOM between tests so component tests
// stay isolated.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
