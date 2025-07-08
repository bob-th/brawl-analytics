import App from "./App.tsx"
import Login from "./Login.tsx"
import About from "./About.tsx"
import { type RouteObject } from 'react-router-dom';

const routes: RouteObject[] = [
    {
        path: "/",
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
    

];

export default routes;