import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RequireRole from "@/components/auth/RequireRole";
import type { Employee } from "@/lib/api/employees";
import { routes } from "@/router";

const employee: Employee = {
  id: 1,
  fullName: "Ресепшенов Иван Петрович",
  firstNamePatronymic: "Иван Петрович",
  shortName: "Ресепшенов И.П.",
  initials: "РИ",
  role: "reception",
  positionTitle: "Администратор",
  status: "active",
};

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn<typeof fetch>();

function mockBackend({ authed }: { authed: boolean }) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url === "/api/employees/me") {
      return authed ? json(200, employee) : json(401, { detail: "Не авторизован" });
    }
    if (url === "/api/auth/refresh") {
      return json(401, { detail: "Refresh-токен отсутствует" });
    }
    if (url === "/api/search?q=") return json(200, { patients: [], appointments: [] });
    if (url === "/api/reports/reception-summary") {
      return json(200, {
        date: "2026-10-25",
        shift: null,
        queue: { waiting: 0, inProgress: 0 },
        doctors: [],
        invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
      });
    }
    return json(404);
  });
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // jsdom не реализует прокрутку, а ScrollRestoration её вызывает
  window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("маршруты и гварды", () => {
  it("без сессии защищённая страница ведёт на /login с возвратом", async () => {
    mockBackend({ authed: false });

    const router = renderAt("/appointments?week=2");

    expect(await screen.findByText("Вход в систему")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe(
      "?next=%2Fappointments%3Fweek%3D2",
    );
  });

  it("с сессией открывается дашборд с меню по роли", async () => {
    mockBackend({ authed: true });

    renderAt("/");

    // у регистратора главная — рабочее место «Стойка», без врачебного приветствия
    expect(await screen.findByText("Стойка регистратуры")).toBeInTheDocument();
    expect(screen.queryByText(/Добрый день/)).toBeNull();
    // reception видит «Приёмы», но не «Отчёт за день» (только head_doctor)
    expect(screen.getByRole("link", { name: "Приёмы" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Отчёт за день" })).toBeNull();
  });

  it("вошедшего с /login возвращает на запрошенную страницу", async () => {
    mockBackend({ authed: true });

    const router = renderAt("/login?next=%2Fpatients");

    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe("/patients");
    });
  });

  it("неизвестный URL показывает 404 внутри оболочки", async () => {
    mockBackend({ authed: true });

    renderAt("/no-such-page");

    expect(await screen.findByText("Страница не найдена")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Стойка" })).toBeInTheDocument();
  });

  it("RequireRole: запрещённой роли — «Нет доступа», разрешённой — контент", async () => {
    mockBackend({ authed: true });
    const routesWithGuards = [
      {
        element: routes[0].children![1].element, // RequireAuth
        children: [
          {
            element: <RequireRole allow={["head_doctor"]} />,
            children: [{ path: "secret", element: <p>Секрет</p> }],
          },
          {
            element: <RequireRole allow={["reception"]} />,
            children: [{ path: "open", element: <p>Открыто</p> }],
          },
        ],
      },
    ];

    const denied = createMemoryRouter(routesWithGuards, { initialEntries: ["/secret"] });
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={denied} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(screen.queryByText("Секрет")).toBeNull();
    unmount();

    const allowed = createMemoryRouter(routesWithGuards, { initialEntries: ["/open"] });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={allowed} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Открыто")).toBeInTheDocument();
  });
});
