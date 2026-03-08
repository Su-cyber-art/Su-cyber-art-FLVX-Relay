import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import "@/styles/globals.css";

async function cleanupLegacyServiceWorkers() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const regs = await navigator.serviceWorker.getRegistrations();

    await Promise.all(regs.map((reg) => reg.unregister()));
  } catch {
    // ignore
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();

      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore
  }
}

void cleanupLegacyServiceWorkers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Provider>
      <App />
    </Provider>
  </BrowserRouter>,
);
