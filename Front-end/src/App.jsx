import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Navigate, Route, Routes } from "react-router";
import Header from "./components/Header.jsx";
import Signup from "./components/Signup.jsx";
import Login from "./components/Login.jsx";
import { handleLogin } from "./API/API.js";
import { useState } from "react";
import UserCreation from "./components/UserCreation.jsx";

// TODO: add index route homepage once created

//TODO: add admin route protection

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const login = async (credentials) => {
    try {
      await handleLogin(credentials);
      setLoggedIn(true);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <Routes>
        <Route path='/' element={<Header loggedIn={loggedIn} />}>
          <Route
            path='signup'
            element={loggedIn ? <Navigate replace to='/' /> : <Signup />}
          />
          <Route
            path='login'
            element={
              loggedIn ? <Navigate replace to='/' /> : <Login login={login} />
            }
          />
          <Route path='/user-creation' element={<UserCreation />} />
        </Route>

        <Route path='*' element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
