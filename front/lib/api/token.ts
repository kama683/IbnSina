const COOKIE_NAME = "auth_token";

/**
 * Токен читаем из cookie — это работает и в Server Components (через next/headers),
 * и в клиентских компонентах (через document.cookie), так как бэкенд на отдельном
 * порту и не получает cookie автоматически — мы сами кладём его в заголовок.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return store.get(COOKIE_NAME)?.value ?? null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthToken(token: string, maxAgeSeconds: number): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearAuthToken(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
