/** Скелетон строк таблицы той же высоты, что и настоящие (68px). */
export default function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Загрузка" aria-live="polite" className="animate-pulse">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-[68px] items-center gap-4 border-t border-row-line px-6 first:border-t-0">
          <div className="h-4 w-16 rounded bg-chip-gray" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-chip-gray" />
            <div className="h-3 w-1/2 rounded bg-chip-gray" />
          </div>
          <div className="h-6 w-20 rounded-full bg-chip-gray" />
        </div>
      ))}
    </div>
  );
}
