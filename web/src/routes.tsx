import App from "./App.tsx";
//import Login from "@components/auth/Login.tsx"
import About from "./pages/About.tsx";
import Layout from "./components/layout/Layout.tsx";
import { type RouteObject } from 'react-router-dom';
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
const routes: RouteObject[] = [
    {
    path: "/",
    element: <Layout />, // Wrap all routes with layout
    children: [
      {
        index: true, // Equivalent to path: "/"
        element: <App />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/player/:tag",
        element: <Dashboard />,
      },
    ],
    },

];

export default routes;