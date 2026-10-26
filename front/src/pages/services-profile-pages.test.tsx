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

  it("админ: видит «Добавить услугу» и неактивные, как главврач", async () => {
    mockBackend(makeEmployee("admin"), { "/api/services?includeInactive=true": [service] });

    renderApp("/services");

    expect(await screen.findByRole("button", { name: /Добавить услугу/ })).toBeInTheDocument();
  });

  it("удаление: модалка подтверждения, после DELETE строка исчезает", async () => {
    mockBackend(makeEmployee("head_doctor"), {
      "/api/services?includeInactive=true": [service],
      "DELETE /api/services/1": { id: 1 },
    });

    renderApp("/services");
    await userEvent.click(
      await screen.findByRole("button", { name: "Удалить Консультация терапевта" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Удалить услугу?")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(await screen.findByText("Прейскурант пуст")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("удаление: 409 — «Невозможно удалить», можно только отключить", async () => {
    mockBackend(makeEmployee("head_doctor"), {
      "/api/services?includeInactive=true": [service],
      "DELETE /api/services/1": () =>
        json(409, { detail: "Услуга уже есть в счетах — удалить нельзя, отключите её" }),
      "PATCH /api/services/1": { ...service, isActive: false },
    });

    renderApp("/services");
    await userEvent.click(
      await screen.findByRole("button", { name: "Удалить Консультация терапевта" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(await within(dialog).findByText("Невозможно удалить услугу")).toBeInTheDocument();
    expect(within(dialog).getByText(/можете только отключить/)).toBeInTheDocument();
    // услуга осталась в таблице
    expect(screen.getByText("Консультация терапевта")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Отключить услугу" }));

    expect(await screen.findByText("Отключена")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("врач и медсестра: «Нет доступа» (прейскурант им закрыт)", async () => {
    for (const role of ["doctor", "nurse"] as const) {
      mockBackend(makeEmployee(role));
      const { unmount } = renderApp("/services");
      expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
      unmount();
    }
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
    office: "Каб. 12",
    badges: [],
    contacts: { phone: "+7 700 111 22 33", email: "doc@clinic.kz" },
    metrics: { appointmentsInMay: 20, experienceYears: 10 },
    professional: {
      specialty: "Эндокринолог",
      licenseNumber: "L-1",
      licenseValidUntil: "2030-01-01",
      certificateNumber: "C-1",
      certificateValidUntil: "2030-01-01",
      about: "О враче",
    },
    schedule: [],
  } satisfies DoctorProfile;

  it("врач видит профиль", async () => {
    mockBackend(doctor, { "/api/employees/me/profile": profile });

    renderApp("/profile");

    expect(await screen.findByText("doc@clinic.kz")).toBeInTheDocument();
    // настройки — тут же, отдельной страницы больше нет
    expect(screen.getByText("Уведомления")).toBeInTheDocument();
    expect(screen.getByText("О системе")).toBeInTheDocument();
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

  it("медсестре вместо профиля врача — карточка учётной записи и настройки", async () => {
    const nurse = makeEmployee("nurse");
    mockBackend(nurse);

    renderApp("/profile");

    // в боковой панели — краткое имя, в карточке профиля — полное ФИО
    expect(await screen.findByText(nurse.fullName)).toBeInTheDocument();
    expect(screen.getByText("Уведомления")).toBeInTheDocument();
    expect(requested()).not.toContain("/api/employees/me/profile");
  });
});

describe("настройки", () => {
  it("/settings ведёт на единый профиль, доступно всем ролям", async () => {
    mockBackend(makeEmployee("admin"));

    const { router } = renderApp("/settings");

    expect(await screen.findByText("О системе")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/profile");
  });
});
