import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  items: RowMenuItem[];
  ariaLabel: string;
};

/** Кнопка «⋯» с выпадающим меню действий строки. */
export default function RowMenu({ items, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-field-line bg-white text-ink-2 transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 ${
                  item.danger ? "text-danger" : "text-ink"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
