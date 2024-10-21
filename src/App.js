import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import JiraReport from './components/JiraReport';

import './App.css';

const router = createBrowserRouter([
  {
    path: "/",
    element: <JiraReport />,
  }
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
