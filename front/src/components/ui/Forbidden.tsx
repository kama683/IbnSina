import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="max-w-md rounded-xl border border-gray-200/80 bg-white p-6 text-center shadow-sm">
        <p className="text-3xl font-semibold text-gray-300">403</p>
        <h1 className="mt-2 text-base font-semibold text-gray-900">
          Нет доступа
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Этот раздел недоступен для вашей роли.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#154a2f]"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
