import { createBrowserRouter } from "react-router-dom";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireRole from "@/components/auth/RequireRole";
import AppLayout from "@/components/layout/AppLayout";
import RootLayout from "@/components/layout/RootLayout";
import RouteError from "@/components/layout/RouteError";
import NotFound from "@/components/ui/NotFound";
import { VIEW_SCHEDULE_ROLES } from "@/lib/roles";
import AppointmentsPage from "@/pages/AppointmentsPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
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
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
