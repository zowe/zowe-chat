import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import theme from './theme';
import ZoweChatApp from "./ZoweChatApp";

const container = document.getElementById("root")
const root = createRoot(container!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>

        <CssBaseline />
        <ZoweChatApp />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);