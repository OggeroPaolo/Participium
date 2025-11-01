import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Route, Routes } from "react-router";

function App() {
  return (
    <>
      <Routes>
        <Route path='*' element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App
