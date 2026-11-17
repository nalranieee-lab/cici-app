import React from "react"

import ReactDOM from "react-dom/client"

import App from "./App"

import "./index.css"

import { Toaster } from "./components/Toast"

import "./pages/Readability.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
)
