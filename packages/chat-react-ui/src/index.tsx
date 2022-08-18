import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ZoweChatApp from "./ZoweChatApp";

import "./index.css";

const container = document.getElementById("root")
const root = createRoot(container!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ZoweChatApp />
    </BrowserRouter>
  </React.StrictMode>,
);