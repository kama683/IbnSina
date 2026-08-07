/**
 * Базовый клиент для запросов к FastAPI-бэкенду.
 *
 * Все HTTP-вызовы к API должны идти через этот файл (или функции из lib/api/*),
 * а не через голый fetch в компонентах — так проще менять URL, ловить ошибки и типизировать ответы.
 */

import { clearAuthToken, getAuthToken } from "./token";

// Адрес бэкенда из .env.local; fallback на localhost для локальной разработки
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(status: number): void {
  if (status !== 401) return;
  if (typeof window === "undefined") return;
  clearAuthToken();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/**
 * Ошибка API — бросаем её, когда сервер ответил не 2xx.
 * Отдельный класс удобен: в catch можно отличить сетевую ошибку от ответа API.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Универсальный GET-запрос к API.
 *
 * @param path — путь без домена, например "/api/doctors/me"
 * @param init — опции fetch (кэш Next.js, заголовки и т.д.)
 * @returns распарсенный JSON с типом T
 */
export async function apiGet<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Склеиваем базовый URL и путь эндпоинта
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    // Пробрасываем остальные опции (cache, next.revalidate и т.д.)
    ...init,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(await authHeaders()),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json() as Promise<T>;
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
  handleUnauthorized(response.status);
  throw new ApiError(response.status, message);
}

/**
 * PATCH-запрос к API (сохранение форм, обновление записей).
 */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json() as Promise<T>;
}

/**
 * POST-запрос к API (создание записей).
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json() as Promise<T>;
}