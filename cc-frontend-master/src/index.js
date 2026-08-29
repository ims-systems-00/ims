import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { ApplicationContextProvider } from "./store/applicationStore";
import { startup } from "./startup";
import { DrawerContextProvider } from "@ims-systems-00/ims-ui-kit";
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <ApplicationContextProvider>
      <DrawerContextProvider>
        <App />
      </DrawerContextProvider>
    </ApplicationContextProvider>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
startup();
