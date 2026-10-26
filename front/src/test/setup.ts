import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { vi } from "vitest";

// Сценарии с userEvent в jsdom при параллельном запуске файлов медленнее
// привычных 1000 мс на ожидание findBy*/waitFor — это не ошибка кода.
configure({ asyncUtilTimeout: 5000 });

const waitFor = vi.waitFor.bind(vi);
vi.waitFor = ((callback, options) =>
  waitFor(callback, {
    timeout: 5000,
    interval: 25,
    ...(typeof options === "number" ? { timeout: options } : options),
  })) as typeof vi.waitFor;
