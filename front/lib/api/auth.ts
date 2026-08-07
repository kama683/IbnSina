import { apiGet, apiPost } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  doctorId: number | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

/** Текущий авторизованный пользователь. */
export function getAuthUser(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me");
}

/** Вход по email/паролю (POST /api/auth/login). */
export function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { email, password });
}
