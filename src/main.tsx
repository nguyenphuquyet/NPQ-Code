import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { StudioProvider } from "./lib/store";
import { I18nProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { ContextMenuProvider } from "./components/ContextMenu";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <StudioProvider>
          <ContextMenuProvider>
            <App />
          </ContextMenuProvider>
        </StudioProvider>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>,
);
