import Link from "next/link";
import QueueContent from "@/components/queue/QueueContent";
import { getQueueAppointments } from "@/lib/api/appointments";

export default async function QueuePage() {
  const appointments = await getQueueAppointments();

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

      <QueueContent initialAppointments={appointments} />
    </div>
  );
}
