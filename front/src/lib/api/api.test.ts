import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiPost, setSessionExpiredHandler } from "./api";

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn<typeof fetch>();
const expired = vi.fn();

function urls(): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input));
}

beforeEach(() => {
  fetchMock.mockReset();
  expired.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  setSessionExpiredHandler(expired);
});

afterEach(() => {
  setSessionExpiredHandler(null);
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("шлёт cookie и возвращает JSON", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { id: 1 }));

    await expect(apiGet("/api/auth/me")).resolves.toEqual({ id: 1 });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "GET",
      credentials: "include",
    });
  });

  it("достаёт detail из ответа с ошибкой", async () => {
    fetchMock.mockResolvedValueOnce(json(409, { detail: "Слот занят" }));

    const error = await apiPost("/api/appointments", {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "Слот занят" });
    expect(expired).not.toHaveBeenCalled();
  });

  it("на 401 продлевает сессию и повторяет запрос", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { detail: "Не авторизован" }))
      .mockResolvedValueOnce(json(200, { accessToken: "x" })) // refresh
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(apiGet("/api/patients")).resolves.toEqual({ ok: true });

    expect(urls()).toEqual([
      "/api/patients",
      "/api/auth/refresh",
      "/api/patients",
    ]);
    expect(expired).not.toHaveBeenCalled();
  });

  it("параллельные 401 делят один refresh", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, { accessToken: "x" });
      }
      // Первый заход на каждый путь — 401, повтор после refresh — 200.
      const seen = urls().filter((u) => u === url).length;
      return seen === 1 ? json(401) : json(200, { url });
    });

    const results = await Promise.all(
      ["/api/a", "/api/b", "/api/c", "/api/d", "/api/e"].map((p) =>
        apiGet<{ url: string }>(p),
      ),
    );

    expect(results.map((r) => r.url)).toEqual([
      "/api/a",
      "/api/b",
      "/api/c",
      "/api/d",
      "/api/e",
    ]);
    expect(urls().filter((u) => u === "/api/auth/refresh")).toHaveLength(1);
  });

  it("если refresh отклонён — сессия истекла, один вызов обработчика", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(
        json(401, { detail: "Недействительный refresh-токен" }),
      );

    const error = await apiGet("/api/patients").catch((e) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(urls()).toEqual(["/api/patients", "/api/auth/refresh"]);
  });

  it("401 после успешного refresh не зацикливается", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200))
      .mockResolvedValueOnce(json(401, { detail: "Не авторизован" }));

    const error = await apiGet("/api/patients").catch((e) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("неверный пароль на /login не запускает refresh", async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { detail: "Неверный email или пароль" }),
    );

    const error = await apiPost("/api/auth/login", {}).catch((e) => e);

    expect(error).toMatchObject({
      status: 401,
      message: "Неверный email или пароль",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(expired).not.toHaveBeenCalled();
  });

  it("если бэкенд недоступен при refresh — из сессии не выходим", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = await apiGet("/api/patients").catch((e) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(expired).not.toHaveBeenCalled();
  });

  it("после завершённого refresh следующий 401 запускает новый refresh", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200))
      .mockResolvedValueOnce(json(200, { n: 1 }))
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200))
      .mockResolvedValueOnce(json(200, { n: 2 }));

    await apiGet("/api/x");
    await apiGet("/api/x");

    expect(urls().filter((u) => u === "/api/auth/refresh")).toHaveLength(2);
  });
});
