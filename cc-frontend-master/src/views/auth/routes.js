import Token from "./Token";
import Landing from "./Landing";
import Login from "./Login";
import PreparationScreen from "./PreparationScreen";
import OrganisationSelection from "./OrganisationSelection";

const routes = [
  { path: "/login", element: <Login /> },
  { path: "/landing", element: <Landing /> },
  { path: "/preparation-screen", element: <PreparationScreen /> },
  { path: "/organisation-selection", element: <OrganisationSelection /> },
  { path: "/auth-token", element: <Token /> },
];
export default routes;
