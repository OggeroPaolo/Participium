import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Navigate, Route, Routes } from "react-router";
import Header from "./components/Header.jsx";
import Signup from "./components/Signup.jsx";
import Login from "./components/Login.jsx";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import UserCreation from "./components/UserCreation.jsx";

// TODO: add index route homepage once created

//TODO: add admin route protection

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    // Listener per aggiornare loggedIn al cambio stato autenticazione Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, [auth]);

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
              loggedIn ? <Navigate replace to='/' /> : <Login />
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
