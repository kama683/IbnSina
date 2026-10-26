import { createBrowserRouter, Navigate } from "react-router-dom";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireRole from "@/components/auth/RequireRole";
import AppLayout from "@/components/layout/AppLayout";
import RootLayout from "@/components/layout/RootLayout";
import RouteError from "@/components/layout/RouteError";
import NotFound from "@/components/ui/NotFound";
import {
  ANY_STAFF_ROLES,
  DECIDE_REFUND_ROLES,
  MANAGE_CASH_ROLES,
  VIEW_DAILY_REPORT_ROLES,
  VIEW_SCHEDULE_ROLES,
  VIEW_SERVICES_ROLES,
} from "@/lib/roles";
import AppointmentsRoute from "@/pages/AppointmentsRoute";
import DailyReportTab from "@/components/cash/DailyReportTab";
import InvoicesTab from "@/components/cash/InvoicesTab";
import MyRefundRequestsTab from "@/components/cash/MyRefundRequestsTab";
import RefundsTab from "@/components/cash/RefundsTab";
import ShiftRoute from "@/components/cash/ShiftRoute";
import CashRegisterPage from "@/pages/CashRegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import InvoicePage from "@/pages/InvoicePage";
import InvoiceReceiptPage from "@/pages/InvoiceReceiptPage";
import LoginPage from "@/pages/LoginPage";
import PatientExaminationPage from "@/pages/PatientExaminationPage";
import PatientProfilePage from "@/pages/PatientProfilePage";
import PatientsPage from "@/pages/PatientsPage";
import ProfilePage from "@/pages/ProfilePage";
import ServicesPage from "@/pages/ServicesPage";

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
                  { path: "appointments", element: <AppointmentsRoute /> },
                  // «Живая очередь» объединена с «Приёмами»
                  { path: "queue", element: <Navigate to="/appointments" replace /> },
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
              { path: "profile", element: <ProfilePage /> },
              {
                element: <RequireRole allow={MANAGE_CASH_ROLES} />,
                children: [
                  {
                    path: "cash-register",
                    element: <CashRegisterPage />,
                    children: [
                      { index: true, element: <ShiftRoute /> },
                      { path: "invoices", element: <InvoicesTab /> },
                      { path: "requests", element: <MyRefundRequestsTab /> },
                      // Очередь решений по возвратам — только у главврача;
                      // регистратор видит свои заявки во вкладке «Мои заявки».
                      {
                        element: <RequireRole allow={DECIDE_REFUND_ROLES} />,
                        children: [{ path: "refunds", element: <RefundsTab /> }],
                      },
                      {
                        element: <RequireRole allow={VIEW_DAILY_REPORT_ROLES} />,
                        children: [{ path: "report", element: <DailyReportTab /> }],
                      },
                    ],
                  },
                ],
              },
              // «Возвраты» и «Отчёт за день» стали вкладками кассы — старые ссылки ведут туда.
              { path: "refunds", element: <Navigate to="/cash-register/refunds" replace /> },
              { path: "reports/daily", element: <Navigate to="/cash-register/report" replace /> },
              // Счета без ролевой группы, как и в Next: доступ решает бэкенд.
              { path: "invoices/:id", element: <InvoicePage /> },
              { path: "invoices/:id/receipt", element: <InvoiceReceiptPage /> },
              // «Настройки» слиты с «Профилем» — старые ссылки ведут туда же.
              { path: "settings", element: <Navigate to="/profile" replace /> },
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
