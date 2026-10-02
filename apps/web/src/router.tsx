import ProjectsPage from "./pages/admin/projects";
import ProjectDetailPage from "./pages/admin/project-detail";
import JournalPage from "./pages/admin/journal";
import TavernPage from "./pages/admin/tavern";
import ShopPage from "./pages/admin/shop";
import NotFoundPage from "./pages/not-found";
import { createBrowserRouter, redirect } from "react-router";
import Dashboard from "./pages/admin/dashboard";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import DashboardLayout from "./layouts/dashboard";

import QuestsPage from "./pages/admin/quests";
import MyQuestsPage from "./pages/admin/my-quests";
import SubmitQuestPage from "./pages/admin/submit-quest";
import QuestInstancePage from "./pages/admin/instance-quest";

import ProfilePage from "./pages/admin/profile";
import ClassesPage from "./pages/admin/classes";
import QuestTemplatesListPage from "./pages/admin/templates-quest";
import CreateQuestTemplatePage from "./pages/admin/create-templates-quest";
import EditQuestTemplatePage from "./pages/admin/edit-templates-quest";
import ReviewQuestsPage from "./pages/admin/review-quests";
import ReviewQuestPage from "./pages/admin/review-quest";
import RoleGate from "./components/role-gate";
import AchievementsPage from "./pages/admin/achievements";
import ActivityPage from "./pages/admin/activity";
import RankingPage from "./pages/admin/ranking";

async function requireAuth() {
  const token = localStorage.getItem("hq_token");
  if (!token) throw redirect("/");
  return null;
}

export const router = createBrowserRouter([
  { path: "*", element: <NotFoundPage /> },
  { path: "/", element: <Login /> },
  { path: "/register", element: <Register /> },

  {
    path: "/dashboard",
    element: <DashboardLayout />,
    loader: requireAuth,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:id", element: <ProjectDetailPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "tavern", element: <TavernPage /> },
      { path: "shop", element: <ShopPage /> },

      { path: "quests", element: <QuestsPage /> },
      { path: "quests/my", element: <MyQuestsPage /> },
      { path: "quests/submit/:instanceId", element: <SubmitQuestPage /> },
      { path: "quests/instance/:id", element: <QuestInstancePage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "achievements", element: <AchievementsPage /> },
      {
        path: "audit",
        element: (
          <RoleGate roles={["admin"]}>
            <ActivityPage audit />
          </RoleGate>
        ),
      },
      { path: "activity", element: <ActivityPage /> },
      { path: "ranking", element: <RankingPage /> },
      {
        path: "classes",
        element: (
          <RoleGate roles={["admin"]}>
            <ClassesPage />
          </RoleGate>
        ),
      },

      {
        path: "quest-templates",
        element: (
          <RoleGate roles={["admin"]}>
            <QuestTemplatesListPage />
          </RoleGate>
        ),
      },
      {
        path: "quest-templates/create",
        element: (
          <RoleGate roles={["admin"]}>
            <CreateQuestTemplatePage />
          </RoleGate>
        ),
      },
      {
        path: "quest-templates/edit/:id",
        element: (
          <RoleGate roles={["admin"]}>
            <EditQuestTemplatePage />
          </RoleGate>
        ),
      },
      {
        path: "quests/review",
        element: (
          <RoleGate roles={["reviewer", "admin"]}>
            <ReviewQuestsPage />
          </RoleGate>
        ),
      },
      {
        path: "quests/review/:id",
        element: (
          <RoleGate roles={["reviewer", "admin"]}>
            <ReviewQuestPage />
          </RoleGate>
        ),
      },
    ],
  },
]);
