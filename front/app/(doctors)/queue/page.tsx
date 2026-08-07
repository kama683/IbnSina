import Link from "next/link";
import QueueContent from "@/components/queue/QueueContent";
import { getQueueAppointments } from "@/lib/api/appointments";
import { getCurrentEmployee } from "@/lib/api/employees";
import { VIEW_SCHEDULE_ROLES } from "@/lib/roles";

export default async function QueuePage() {
  const employee = await getCurrentEmployee();

  if (!VIEW_SCHEDULE_ROLES.includes(employee.role)) {
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
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Живая очередь недоступна для вашей роли.
        </div>
      </div>
    );
  }

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
