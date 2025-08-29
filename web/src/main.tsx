import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import routes from './routes.tsx'
import './index.css'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query' 
const queryClient = new QueryClient()

const router = createBrowserRouter(routes);
createRoot(document.getElementById('root')!).render(
   <QueryClientProvider client={queryClient}>
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
   </QueryClientProvider>
  
)
