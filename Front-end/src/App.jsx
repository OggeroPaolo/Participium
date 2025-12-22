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
import ReportCreation from "./components/ReportCreation.jsx";
import ReportInfo from "./components/ReportInfo.jsx";
import OfficerReviewList from "./components/OfficerReviewList.jsx";
import TechAssignedReports from "./components/TechAssignedReports.jsx";
import ExtAssignedReports from "./components/ExtAssignedReports.jsx";
import EmailCode from "./components/EmailCode.jsx";

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
                <>
                  {user?.role_name === "Admin" && (
                    <Navigate replace to='/user-list' />
                  )}
                  {user?.role_type === "tech_officer" && (
                    <Navigate replace to='/tech-assigned-reports' />
                  )}
                  {user?.role_type === "external_maintainer" && (
                    <Navigate replace to='/ext-assigned-reports' />
                  )}
                  {user?.role_name === "Citizen" && <Navigate replace to='/' />}
                  {user?.role_name === "Municipal_public_relations_officer" && (
                    <Navigate replace to='/review-reports' />
                  )}
                </>
              ) : (
                <Login />
              )
            }
          />
          <Route
            path='/email-verification'
            element={
              !isAuthenticated ? <EmailCode /> : <Navigate replace to='/' />
            }
          />

          {/* Admin route protection */}
          <Route
            path='/user-creation'
            element={
              user?.role_name === "Admin" ? (
                <UserCreation />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />
          <Route
            path='/user-list'
            element={
              user?.role_name === "Admin" ? (
                <UserList />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />

          {/* Citizen specific routes */}
          <Route
            path='/create-report'
            element={
              user?.role_name === "Citizen" ? (
                <ReportCreation />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />

          {/* Citizen and unlogged user routes */}
          <Route
            path='/reports/:rid'
            element={
              user?.role_name === "Citizen" || !isAuthenticated ? (
                <ReportInfo />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />

          {/* Public Relations Officer specific routes */}
          <Route
            path='/review-reports'
            element={
              user?.role_name === "Municipal_public_relations_officer" ? (
                <OfficerReviewList />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />

          {/* Technical Officer specific routes */}
          <Route
            path='/tech-assigned-reports'
            element={
              user?.role_type === "tech_officer" ? (
                <TechAssignedReports />
              ) : (
                <Navigate replace to='/' />
              )
            }
          />

          {/* External maintainer specific routes */}
          <Route
            path='/ext-assigned-reports'
            element={
              user?.role_type === "external_maintainer" ? (
                <ExtAssignedReports />
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
