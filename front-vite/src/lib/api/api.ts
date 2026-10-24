/**
 * Базовый клиент для запросов к FastAPI-бэкенду.
 *
 * Все HTTP-вызовы к API идут через этот файл (или функции из lib/api/*), а не
 * через голый fetch в компонентах.
 *
 * Токен в JS недоступен (httpOnly-cookie) — браузер сам прикладывает cookie
 * благодаря credentials:"include". API_URL по умолчанию пустой: клиент ходит
 * на относительный /api (dev-proxy Vite / reverse proxy в проде).
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "";

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

async function parseApiError(response: Response): Promise<never> {
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
  throw new ApiError(response.status, message);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
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

  if (!response.ok) {
    await parseApiError(response);
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
