import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { LiveStatusProvider } from "./lib/liveStatus";
import { currentPath } from "./lib/nav";
import "./index.css";

// Pages chargées à la demande : le site public ne télécharge pas le code du cockpit.
const LivePage = lazy(() => import("./live/LivePage.jsx"));
const CockpitApp = lazy(() => import("./cockpit/CockpitApp.jsx"));

/** Routage minimal par chemin (le site reste une page unique avec ancres). */
function Root() {
  const path = currentPath().replace(/\/+$/, "") || "/";

  if (path === "/cockpit" || path.startsWith("/cockpit/")) {
    return <CockpitApp />;
  }
  return (
    <LiveStatusProvider>{path === "/live" ? <LivePage /> : <App />}</LiveStatusProvider>
  );
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<Loading />}>
      <Root />
    </Suspense>
  </React.StrictMode>
);
