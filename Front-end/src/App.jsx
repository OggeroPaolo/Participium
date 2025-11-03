import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Route, Routes } from "react-router";
import Header from "./components/Header.jsx";
import Signup from "./components/Signup.jsx";

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Header />}>
          <Route path='signup' element={<Signup />} />
        </Route>

        <Route path='*' element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
