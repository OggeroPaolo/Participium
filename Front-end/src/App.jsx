import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Navigate, Route, Routes } from "react-router";
import Header from "./components/Header.jsx";
import Home from "./components/Home.jsx";
import Signup from "./components/Signup.jsx";
import Login from "./components/Login.jsx";
import UserCreation from "./components/UserCreation.jsx";
import { logout } from "./firebaseService.js";
import UserList from "./components/UserList.jsx";
import { useAuthSync } from "./hooks/useAuthSync.js";
import useUserStore from "./store/userStore.js";

function App() {
  // Sync Zustand store with Firebase auth state
  useAuthSync();

  // get user data from Zustand store
  const { user, isAuthenticated, isLoading } = useUserStore();

  const handleLogout = async () => {
    try {
      await logout();
      // clearUser is automatic in onAuthStateChanged no need to call here
    } catch (err) {
      console.error("Errore logout: ", err);
    }
  };

  if (isLoading) {
    return (
      <div
        className='d-flex justify-content-center align-items-center'
        style={{ minHeight: "100vh" }}
      >
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path='/'
          element={
            <Header
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={handleLogout}
            />
          }
        >
          <Route index element={<Home />} />
          <Route
            path='signup'
            element={isAuthenticated ? <Navigate replace to='/' /> : <Signup />}
          />
          <Route
            path='login'
            element={
              isAuthenticated ? (
                user?.role_type === "admin" ? (
                  <Navigate replace to='/user-list' />
                ) : (
                  <Navigate replace to='/' />
                )
              ) : (
                <Login />
              )
            }
          />

          {/* Admin route protection */}
          <Route
            path='/user-creation'
            element={
              user?.role_type === "admin" ? (
                <UserCreation />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />
          <Route
            path='/user-list'
            element={
              user?.role_type === "admin" ? (
                <UserList />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />
        </Route>

        <Route path='*' element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
