import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import type { Employee, EmployeeRole } from "@/lib/api/employees";
import type { Appointment, Patient } from "@/lib/types";
import { routes } from "@/router";

export const fetchMock = vi.fn<typeof fetch>();

export function makeEmployee(role: EmployeeRole, overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    fullName: "Тестов Тест Тестович",
    firstNamePatronymic: "Тест Тестович",
    shortName: "Тестов Т.Т.",
    initials: "ТТ",
    role,
    positionTitle: "",
    avatarUrl: null,
    status: "active",
    ...overrides,
  };
}

export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "10",
    patientId: "5",
    employeeId: "1",
    date: "2026-10-24",
    queueNumber: 1,
    patient: "Иванов И.И.",
    complaint: "Головная боль",
    diagnosis: null,
    doctor: "Тестов Т.Т.",
    createdBy: null,
    status: "scheduled",
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    ...overrides,
  };
}

export function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "5",
    fullName: "Иванов Иван Иванович",
    shortName: "Иванов И.И.",
    iin: "900101300123",
    birthDate: "1990-01-01",
    ageLabel: "36 лет",
    gender: "М",
    bloodType: "A(II) Rh+",
    phone: "+7 700 000 00 00",
    address: "г. Алматы",
    lastAppointment: null,
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: [],
    diseases: [],
    ...overrides,
  };
}

export const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Мок-бэкенд: путь (с query) → тело ответа или функция, возвращающая Response.
 * Неописанный путь = 500, чтобы тест падал, а не молча получал пустоту. */
export type Handlers = Record<
  string,
  unknown | ((url: string, init?: RequestInit) => Response | Promise<Response>)
>;

export function mockBackend(employee: Employee, handlers: Handlers = {}) {
  const all: Handlers = { "/api/employees/me": employee, ...handlers };
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const key = `${init?.method ?? "GET"} ${url}`;
    // Ключ вида "/api/appointments?from=*" — совпадение по префиксу.
    const matched = [key, url].find((k) => k in all) ??
      Object.keys(all).find(
        (k) => k.endsWith("*") && (key.startsWith(k.slice(0, -1)) || url.startsWith(k.slice(0, -1))),
      );
    // null — валидное тело ответа (например, /appointments/current без приёма)
    if (matched === undefined) return json(500, { detail: `нет мока для ${key}` });
    const handler = all[matched];
    if (typeof handler === "function") {
      return (handler as (url: string, init?: RequestInit) => Response | Promise<Response>)(url, init);
    }
    return json(200, handler);
  });
}

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient, ...utils };
}

export function setupHarness() {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // jsdom не реализует прокрутку, а ScrollRestoration её вызывает
  window.scrollTo = vi.fn();
}

/** Выбрать врача в окне записи: по умолчанию врач не подставляется. */
export async function pickDoctor(
  user: { type: (el: Element, text: string) => Promise<void>; click: (el: Element) => Promise<void> },
  dialog: HTMLElement,
  shortName: string,
): Promise<void> {
  const input = within(dialog).getByPlaceholderText("Начните вводить фамилию врача");
  await user.type(input, shortName.slice(0, 4));
  await user.click(await within(dialog).findByText(shortName));
  await within(dialog).findByDisplayValue(shortName);
}
