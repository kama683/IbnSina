import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DoctorProfile } from "@/lib/api/doctors";
import type { Service } from "@/lib/api/services";
import {
  fetchMock,
  json,
  makeEmployee,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";

beforeEach(setupHarness);
afterEach(() => vi.unstubAllGlobals());

const service: Service = {
  id: 1,
  code: "CONS-1",
  name: "Консультация терапевта",
  category: "consultation",
  price: 1_500_000,
  durationMinutes: 30,
  isActive: true,
};

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

describe("услуги", () => {
  it("главврач: запрашивает и неактивные, видит «Добавить услугу»", async () => {
    mockBackend(makeEmployee("head_doctor"), {
      "/api/services?includeInactive=true": [service],
    });

    renderApp("/services");

    expect(await screen.findByText("Консультация терапевта")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Добавить услугу/ })).toBeInTheDocument();
  });

  it("ресепшен: только активные, без кнопок управления", async () => {
    mockBackend(makeEmployee("reception"), { "/api/services": [service] });

    renderApp("/services");

    expect(await screen.findByText("Консультация терапевта")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Добавить услугу/ })).toBeNull();
    expect(requested()).toContain("/api/services");
  });

  it("бухгалтер: «Нет доступа» (прейскурант закрыт даже на чтение)", async () => {
    mockBackend(makeEmployee("accountant"));

    renderApp("/services");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
  });
});

describe("профиль врача", () => {
  const doctor = makeEmployee("doctor");
  const profile = {
    ...doctor,
    area: "Участок №3",
    office: "Каб. 12",
    badges: [],
    contacts: { phone: "+7 700 111 22 33", email: "doc@clinic.kz", workplace: "Поликлиника 12" },
    metrics: { patientsInArea: 100, appointmentsInMay: 20, dispensary: 5, experienceYears: 10 },
    professional: {
      specialty: "Эндокринолог",
      qualificationCategory: "Высшая",
      licenseNumber: "L-1",
      licenseValidUntil: "2030-01-01",
      certificateNumber: "C-1",
      certificateValidUntil: "2030-01-01",
      about: "О враче",
    },
    schedule: [],
    education: [],
  } satisfies DoctorProfile;

  it("врач видит профиль", async () => {
    mockBackend(doctor, { "/api/employees/me/profile": profile });

    renderApp("/profile");

    expect(await screen.findByText("Профиль врача")).toBeInTheDocument();
    expect(await screen.findByText("doc@clinic.kz")).toBeInTheDocument();
  });

  it("сохранение шлёт PATCH с изменёнными контактами и перезапрашивает профиль", async () => {
    let saved: unknown = null;
    mockBackend(doctor, {
      "/api/employees/me/profile": profile,
      "PATCH /api/employees/me": () => json(200, profile),
    });
    const baseImpl = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (init?.method === "PATCH") saved = JSON.parse(String(init.body));
      return baseImpl(input, init);
    });
    const user = userEvent.setup();

    renderApp("/profile");
    // email правится построчно: карандаш → поле → галочка → общая кнопка «Сохранить»
    const emailRow = (await screen.findByText("doc@clinic.kz")).closest("li")!;
    await user.click(within(emailRow).getByRole("button", { name: "Редактировать" }));
    const email = within(emailRow).getByDisplayValue("doc@clinic.kz");
    await user.clear(email);
    await user.type(email, "new@clinic.kz");
    await user.click(within(emailRow).getByRole("button", { name: "Сохранить" }));
    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    await vi.waitFor(() => expect(saved).toMatchObject({ email: "new@clinic.kz" }));
    await vi.waitFor(() => {
      expect(requested().filter((url) => url === "/api/employees/me/profile")).toHaveLength(2);
    });
  });

  it("медсестре профиль врача недоступен", async () => {
    mockBackend(makeEmployee("nurse"));

    renderApp("/profile");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
  });
});

describe("настройки", () => {
  it("доступны всем ролям", async () => {
    mockBackend(makeEmployee("admin"));

    renderApp("/settings");

    expect(await screen.findByText("О системе")).toBeInTheDocument();
  });
});
