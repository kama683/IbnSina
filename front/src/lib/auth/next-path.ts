/** Куда вернуться после входа. Принимаем только внутренние пути приложения:
 * `//evil.com` и `https://...` после логина увели бы пользователя на чужой
 * сайт (open redirect). Всё подозрительное → "/". */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  if (raw === "/login" || raw.startsWith("/login?")) return "/";
  return raw;
}

/** URL страницы входа с возвратом на текущий путь. */
export function loginUrl(currentPath: string): string {
  const next = safeNextPath(currentPath);
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
