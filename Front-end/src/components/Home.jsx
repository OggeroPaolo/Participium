import useUserStore from "../store/userStore";
import { GuestDashboard, CitizenDashboard, AuthenticatedUserDashboard } from "./HomeComponents/DashBoards";

function Home() {
  const { user, isAuthenticated } = useUserStore();

  return (
    <>
      {renderDashboard(user, isAuthenticated)}
    </>
  );
}

function renderDashboard(user, isAuthenticated) {
  if (!isAuthenticated) {
    return <GuestDashboard />;
  }

  if (user?.role_type === "citizen") {
    return <CitizenDashboard />;
  }

  return <AuthenticatedUserDashboard user={user} />;
}

export default Home;
