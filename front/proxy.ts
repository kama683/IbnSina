import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Этап 0, коммит 10: имя синхронизировано с ACCESS_TOKEN_COOKIE_NAME из
// back/app/security.py — с коммита 7 бэкенд сам ставит httpOnly-cookie под
// этим именем (старая plaintext auth_token, которую раньше клал клиент,
// больше не существует).
//
// Это только оптимистичная проверка присутствия cookie (Next.js доки прямо
// предостерегают полагаться на Proxy как на единственный механизм авторизации
// — Proxy не может знать роль: JWT содержит только email, а декодировать
// его здесь и лезть в БД за ролью — тяжёлая логика не по адресу). Реальное
// разграничение: RBAC на бэкенде (коммит 6) + ролевые гварды в layout/
// страницах (коммит 9).
const ACCESS_TOKEN_COOKIE = "access_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isLoginPage = pathname === "/login";

  if (!token && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
