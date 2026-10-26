/**
 * Базовый клиент для запросов к FastAPI-бэкенду.
 *
 * Все HTTP-вызовы к API идут через этот файл (или функции из lib/api/*), а не
 * через голый fetch в компонентах.
 *
 * Токен в JS недоступен (httpOnly-cookie) — браузер сам прикладывает cookie
 * благодаря credentials:"include". API_URL по умолчанию пустой: клиент ходит
 * на относительный /api (dev-proxy Vite / reverse proxy в проде).
 *
 * Сессия: access-токен живёт ACCESS_TOKEN_EXPIRE_MINUTES (15 мин), refresh —
 * 30 дней. На 401 клиент один раз зовёт POST /api/auth/refresh и повторяет
 * запрос. Бэкенд ротирует refresh-токен (предъявленный сразу отзывается), так
 * что параллельные 401 обязаны разделить ОДИН refresh — иначе второй вызов
 * придёт с уже отозванным токеном и выкинет пользователя из системы.
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "";

// Эти эндпоинты сами отвечают за сессию — на их 401 refresh не пробуем
// (иначе неверный пароль на /login запустил бы цикл).
const NO_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
];

/** Ошибка API — бросаем, когда сервер ответил не 2xx. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let onSessionExpired: (() => void) | null = null;

/** Что делать, когда сессию не удалось продлить (обычно — уйти на /login).
 * Регистрируется один раз auth-оболочкой приложения. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

type RefreshResult = "ok" | "denied" | "error";

let refreshInFlight: Promise<RefreshResult> | null = null;

/** Продлевает сессию. Одновременные вызовы делят один сетевой запрос.
 * "denied" — сервер отказал (refresh-токена нет/просрочен/отозван),
 * "error" — сеть/бэкенд недоступны: сессия не обязательно мертва. */
function refreshSession(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((response): RefreshResult => {
        if (response.ok) return "ok";
        return response.status === 401 || response.status === 403
          ? "denied"
          : "error";
      })
      .catch((): RefreshResult => "error")
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let message = `Ошибка API: ${response.status}`;
  try {
    const body = await response.json();
    if (body?.detail) {
      message =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    }
  } catch {
    // Тело не JSON
  }
  return new ApiError(response.status, message);
}

function send(
  method: string,
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  let response = await send(method, path, body, init);

  if (response.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refreshSession();

    if (refreshed === "ok") {
      response = await send(method, path, body, init);
      // Снова 401 сразу после успешного refresh — сессия действительно
      // невалидна (например, пользователь деактивирован).
      if (response.status === 401) onSessionExpired?.();
    } else if (refreshed === "denied") {
      onSessionExpired?.();
    }
    // "error": бэкенд недоступен — отдаём исходный 401, из сессии не выходим.
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>("GET", path, undefined, init);
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>("PATCH", path, body, init);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>("POST", path, body, init);
}

export function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>("DELETE", path, undefined, init);
}

