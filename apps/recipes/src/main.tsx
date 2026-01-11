import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import "./styles/global.css";

const globalBuffer = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
};

globalBuffer.Buffer = globalBuffer.Buffer ?? Buffer;

const root = ReactDOM.createRoot(document.getElementById("root")!);

import("./App").then(({ default: App }) => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
