import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { setSessionExpiredHandler } from "@/lib/api/api";
import { loginUrl } from "@/lib/auth/next-path";

/** Связывает API-клиент (он живёт вне React) с роутером: когда продлить
 * сессию не удалось, чистим кэш ушедшего пользователя и уходим на /login. */
export default function SessionExpiredBridge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Обработчик регистрируется один раз, а путь ему нужен актуальный.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      const { pathname, search } = locationRef.current;
      // На самой странице входа 401 — нормальное состояние «не вошли».
      if (pathname === "/login") return;
      queryClient.clear();
      navigate(loginUrl(pathname + search), { replace: true });
    });
    return () => setSessionExpiredHandler(null);
  }, [navigate, queryClient]);

  return null;
}
