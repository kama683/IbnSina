import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Строка под заголовком (14px, приглушённая). */
  subtitle?: string;
  /** Главные действия страницы — справа. */
  actions?: ReactNode;
};

/** Верх страницы: заголовок, подпись и действия. Хлебных крошек нет. */
export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
