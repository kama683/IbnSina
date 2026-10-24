import { createBrowserRouter } from "react-router-dom";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireRole from "@/components/auth/RequireRole";
import AppLayout from "@/components/layout/AppLayout";
import RootLayout from "@/components/layout/RootLayout";
import RouteError from "@/components/layout/RouteError";
import NotFound from "@/components/ui/NotFound";
import {
  ANY_STAFF_ROLES,
  HAS_DOCTOR_PROFILE_ROLES,
  VIEW_SCHEDULE_ROLES,
  VIEW_SERVICES_ROLES,
} from "@/lib/roles";
import AppointmentsPage from "@/pages/AppointmentsPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import PatientExaminationPage from "@/pages/PatientExaminationPage";
import PatientProfilePage from "@/pages/PatientProfilePage";
import PatientsPage from "@/pages/PatientsPage";
import ProfilePage from "@/pages/ProfilePage";
import ServicesPage from "@/pages/ServicesPage";
import SettingsPage from "@/pages/SettingsPage";
import QueuePage from "@/pages/QueuePage";

// Структура зеркалит app/ из Next: /login — публичный, всё остальное внутри
// RequireAuth (= proxy.ts) и AppLayout (= app/(doctors)/layout.tsx).
// Ролевые группы (<RequireRole allow=...>) добавляются вместе со страницами.
// "*" внутри AppLayout: неизвестный URL авторизованного показываем с меню,
// неавторизованного RequireAuth сначала отправит на /login.
export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: "login",
        element: (
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        ),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              {
                element: <RequireRole allow={VIEW_SCHEDULE_ROLES} />,
                children: [
                  { path: "appointments", element: <AppointmentsPage /> },
                  { path: "queue", element: <QueuePage /> },
                ],
              },
              {
                element: <RequireRole allow={ANY_STAFF_ROLES} />,
                children: [
                  { path: "patients", element: <PatientsPage /> },
                  { path: "patients/:id", element: <PatientProfilePage /> },
                ],
              },
              // Осмотр без ролевой группы, как и в Next: доступ решает бэкенд
              // (403 → QueryBoundary покажет «Нет доступа»).
              {
                path: "patients/:id/examination",
                element: <PatientExaminationPage />,
              },
              {
                element: <RequireRole allow={VIEW_SERVICES_ROLES} />,
                children: [{ path: "services", element: <ServicesPage /> }],
              },
              {
                element: <RequireRole allow={HAS_DOCTOR_PROFILE_ROLES} />,
                children: [{ path: "profile", element: <ProfilePage /> }],
              },
              { path: "settings", element: <SettingsPage /> },
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
