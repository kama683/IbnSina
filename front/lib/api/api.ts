/**
 * Базовый клиент для запросов к FastAPI-бэкенду.
 *
 * Все HTTP-вызовы к API должны идти через этот файл (или функции из lib/api/*),
 * а не через голый fetch в компонентах — так проще менять URL, ловить ошибки и типизировать ответы.
 */

// Адрес бэкенда из .env.local; fallback на localhost для локальной разработки
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    method: "GET",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    // Пробрасываем остальные опции (cache, next.revalidate и т.д.)
    ...init,
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
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
    ...init,
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
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json() as Promise<T>;
}