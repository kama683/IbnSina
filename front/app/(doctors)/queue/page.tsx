import Link from "next/link";

export default function QueuePage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Живая очередь</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Живая очередь
        </h1>
      </div>

      <section className="rounded-xl border border-gray-200/80 bg-white px-5 py-10 text-center shadow-sm">
        <p className="text-sm text-gray-500">Раздел в разработке</p>
      </section>
    </div>
  );
}
