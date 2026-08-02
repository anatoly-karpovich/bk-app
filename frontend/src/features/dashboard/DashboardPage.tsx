import GamePageHeader from "../../components/GamePageHeader";
import type { CurrentUser } from "../auth/types";
import { getDashboardGreeting } from "./dashboardPage.helpers";

interface DashboardPageProps {
  user: CurrentUser;
}

export default function DashboardPage({ user }: DashboardPageProps) {
  const greeting = getDashboardGreeting(new Date().getHours());

  return (
    <GamePageHeader
      breadcrumbPath="/"
      title={`${greeting}, ${user.displayName}`}
    />
  );
}
