import { apiGet, apiPost } from "./api";
import type { EmployeeRole } from "./employees";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: EmployeeRole;
  employeeId: number;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  // Deprecated: с коммита 7 бэкенд параллельно ставит httpOnly-cookie тем же
  // ответом — на этот JSON-токен клиент с коммита 10 больше не полагается,
  // поле снимется вместе с деprecated-механикой на бэкенде.
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

/** Текущий авторизованный пользователь. */
export function getAuthUser(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me");
}

/** Вход по email/паролю (POST /api/auth/login) — httpOnly-cookie ставит сам
 * бэкенд тем же ответом (credentials:"include" в api.ts), клиенту ничего
 * сохранять вручную не нужно. */
export function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { email, password });
}

/** Выход (POST /api/auth/logout) — отзывает refresh-токен и чистит cookie
 * на бэкенде; клиент не может сделать это сам (httpOnly). */
export function logout(): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>("/api/auth/logout", {});
}
