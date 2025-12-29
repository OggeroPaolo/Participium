import useUserStore from "../store/userStore";
import {
  CitizenDashboard,
  AuthenticatedUserDashboard,
} from "./HomeComponents/DashBoards";

function Home() {
  const { user, isAuthenticated } = useUserStore();

  return <>{renderDashboard(user, isAuthenticated)}</>;
}

function renderDashboard(user, isAuthenticated) {
  if (user?.role_type === "citizen" || !isAuthenticated) {
    return <CitizenDashboard />;
  }

  return <AuthenticatedUserDashboard user={user} />;
}

export default Home;
