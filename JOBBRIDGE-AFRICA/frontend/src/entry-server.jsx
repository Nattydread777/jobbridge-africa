import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { AuthProvider } from "./context/AuthContext";
import { AppContent } from "./App";

export const renderRoute = (path) => renderToString(
  <StaticRouter location={path}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </StaticRouter>,
);
