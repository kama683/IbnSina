export type ButtonVariant = "primary" | "secondary" | "secondaryGreen" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50";

const SIZES: Record<ButtonSize, string> = {
  // кнопка в строке таблицы
  sm: "h-9 rounded-[9px] px-3.5 text-sm",
  // кнопка в шапке страницы
  md: "h-[42px] rounded-[10px] px-[18px] text-sm",
  // «Начать приём»
  lg: "h-12 rounded-xl px-6 text-base font-bold",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-btn-line bg-white text-ink hover:bg-subtle",
  secondaryGreen: "border border-brand-line bg-white text-brand hover:bg-brand-tint",
  danger: "border border-danger-line bg-white text-danger hover:bg-danger-soft",
};

/** Классы кнопки — годятся и для <button>, и для <Link>. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${extra}`.trim();
}
