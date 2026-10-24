type Props = {
  /** На весь экран — для проверки сессии до отрисовки layout. */
  fullscreen?: boolean;
  label?: string;
};

export default function PageLoader({ fullscreen = false, label = "Загрузка…" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-3 text-sm text-gray-500 ${
        fullscreen ? "min-h-screen" : "py-16"
      }`}
    >
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#1a5c3a]"
      />
      {label}
    </div>
  );
}
