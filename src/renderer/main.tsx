import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

// Renderer entry. The UI talks to the main process only through `window.recrd`
// (the preload bridge); it never touches Node, the filesystem or the database.
const container = document.getElementById("root");
if (container === null) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
