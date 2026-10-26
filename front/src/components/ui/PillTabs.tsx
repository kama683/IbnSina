type Tab<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  value: T;
  tabs: Tab<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** compact — высота 38 (вкладки внутри карточки), по умолчанию 40. */
  compact?: boolean;
};

/** Вкладки-таблетки; у вкладки может быть счётчик. */
export default function PillTabs<T extends string>({
  value,
  tabs,
  onChange,
  ariaLabel,
  compact = false,
}: Props<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap items-center gap-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-2 rounded-[10px] px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              compact ? "h-[38px]" : "h-10"
            } ${active ? "bg-brand font-semibold text-white" : "font-medium text-ink-2 hover:bg-subtle"}`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={
                  active
                    ? "rounded-full bg-white/[.22] px-[7px] text-xs font-semibold leading-5"
                    : "text-xs text-ink-3"
                }
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
