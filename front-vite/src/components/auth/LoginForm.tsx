import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { ApiError } from "@/lib/api/api";
import { login } from "@/lib/api/auth";
import { safeNextPath } from "@/lib/auth/next-path";

export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Этап 0, коммит 10: бэкенд сам ставит httpOnly-cookie тем же ответом
      // (credentials:"include" в api.ts) — вручную сохранять токен не нужно.
      await login(email, password);
      // Перезапрашиваем «текущего сотрудника»: до входа в кэше сидит 401.
      await queryClient.resetQueries();
      navigate(safeNextPath(searchParams.get("next")), { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось выполнить вход",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a5c3a]">
            <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            IbnSina
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-gray-900">Вход в систему</h1>
          <p className="mt-1 text-sm text-gray-500">
            Введите рабочий email и пароль
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#1a5c3a] focus:ring-1 focus:ring-[#1a5c3a]"
                placeholder="doctor@poliklinika.kz"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#1a5c3a] focus:ring-1 focus:ring-[#1a5c3a]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-lg bg-[#1a5c3a] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#154a2f] disabled:opacity-60"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
