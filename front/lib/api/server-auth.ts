const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Этап 0, коммит 10: единственное оставшееся серверное чтение cookie.
 *
 * httpOnly не блокирует чтение на сервере (next/headers это не браузерный
 * document.cookie) — но RSC-запросы идут напрямую из Node-процесса Next.js
 * к FastAPI, минуя браузер, так что cookie браузер сам не приложит. Читаем
 * её здесь и пересылаем явным Authorization-заголовком.
 *
 * На клиенте это не нужно — там доверяемся credentials:"include" в api.ts,
 * браузер сам приложит httpOnly-cookie к cross-origin запросу.
 */
export async function serverAuthHeader(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};

  const { cookies } = await import("next/headers");
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
