import { createBrowserRouter } from "react-router-dom";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";
import RequireAuth from "@/components/auth/RequireAuth";
import AppLayout from "@/components/layout/AppLayout";
import RootLayout from "@/components/layout/RootLayout";
import RouteError from "@/components/layout/RouteError";
import NotFound from "@/components/ui/NotFound";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";

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
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
