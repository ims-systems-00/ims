import Organisation from "./Organisation";
import Layout from "./Layout";

const routes = [
  {
    path: "organisation",
    element: <Layout />,
    children: [
      {
        path: "",
        element: <Organisation />,
      },
    ],
  },
];
export default routes;
