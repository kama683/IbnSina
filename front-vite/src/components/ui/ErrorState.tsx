type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullscreen?: boolean;
};

export default function ErrorState({
  title = "Что-то пошло не так",
  message,
  onRetry,
  fullscreen = false,
}: Props) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-center px-4 ${
        fullscreen ? "min-h-screen" : "py-16"
      }`}
    >
      <div className="max-w-md rounded-xl border border-gray-200/80 bg-white p-6 text-center shadow-sm">
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#154a2f]"
          >
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}
