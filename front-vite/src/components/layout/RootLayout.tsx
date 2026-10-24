import { Outlet, ScrollRestoration } from "react-router-dom";
import SessionExpiredBridge from "@/components/auth/SessionExpiredBridge";

/** Корень дерева маршрутов: то, что должно жить внутри роутера на любой
 * странице (включая /login). */
export default function RootLayout() {
  return (
    <>
      <SessionExpiredBridge />
      {/* Next прокручивал наверх при переходе между страницами — повторяем */}
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
