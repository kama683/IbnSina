/**
 * Базовый клиент для запросов к FastAPI-бэкенду.
 *
 * Все HTTP-вызовы к API должны идти через этот файл (или функции из lib/api/*),
 * а не через голый fetch в компонентах — так проще менять URL, ловить ошибки и типизировать ответы.
 *
 * Этап 0, коммит 10: токен больше не читается/не пишется на клиенте (он в
 * httpOnly-cookie, JS до него не дотягивается — в этом весь смысл httpOnly).
 * Браузер сам прикладывает cookie к запросу благодаря credentials:"include"
 * (CORS настроен на allow_credentials=True и точный origin, не "*", иначе
 * это не сработало бы). На сервере (RSC) браузера нет — cookie приходится
 * читать явно через next/headers и пересылать Authorization-заголовком.
 */

import { serverAuthHeader } from "./server-auth";

// Адрес бэкенда из .env.local; fallback на localhost для локальной разработки
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function handleUnauthorized(status: number): void {
  if (status !== 401) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;

  // httpOnly-cookie нельзя стереть из JS — просим бэкенд сделать это сам
  // (заодно отзовёт refresh-токен) и уходим на /login.
  fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).finally(() => {
    window.location.href = "/login";
  });
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
 * Универсальный GET-запрос к API.
 *
 * @param path — путь без домена, например "/api/employees/me"
 * @param init — опции fetch (кэш Next.js, заголовки и т.д.)
 * @returns распарсенный JSON с типом T
 */
export async function apiGet<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(await serverAuthHeader()),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json() as Promise<T>;
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
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await serverAuthHeader()),
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
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await serverAuthHeader()),
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json() as Promise<T>;
}
