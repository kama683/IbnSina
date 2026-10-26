import { useQuery } from "@tanstack/react-query";
import Autocomplete from "@/components/ui/Autocomplete";
import { getQueueInfo } from "@/lib/api/appointments";
import type { DoctorListItem } from "@/lib/api/employees";

const FIELD = "w-full rounded-lg border border-gray-200 px-3 py-2";

type Props = {
  /** Форма открыта: пока закрыта, подсказка очереди не запрашивается. */
  open: boolean;
  doctors: DoctorListItem[];
  doctor: DoctorListItem | null;
  onDoctorChange: (doctor: DoctorListItem | null) => void;
  date: string;
  onDateChange: (date: string) => void;
};

/** Врач + дата приёма — общая часть форм записи и переноса. Время не
 * назначается: под полями показано, сколько пациентов уже ждёт и какой номер
 * получит этот. Если врач в выбранный день не принимает — предупреждение. */
export default function DoctorDateFields({
  open,
  doctors,
  doctor,
  onDoctorChange,
  date,
  onDateChange,
}: Props) {
  const info = useQuery({
    queryKey: ["appointments", "queue-info", doctor?.id, date],
    queryFn: () => getQueueInfo(String(doctor!.id), date),
    enabled: open && doctor !== null && date !== "",
  });

  return (
    <>
      <div className="text-sm">
        <span className="mb-1 block text-gray-600">Врач</span>
        <Autocomplete
          items={doctors}
          value={doctor}
          onChange={onDoctorChange}
          getLabel={(item) => item.shortName}
          getSubLabel={(item) => item.specialty}
          getKey={(item) => item.id}
          placeholder="Начните вводить фамилию врача"
        />
      </div>

      <label className="text-sm">
        <span className="mb-1 block text-gray-600">Дата</span>
        <input
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className={FIELD}
        />
      </label>

      {info.data && !info.data.works && (
        <p role="alert" className="-mt-1 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          Врач в этот день не принимает — выберите другую дату.
        </p>
      )}
      {info.data?.works && (
        <p className="-mt-1 text-[13px] text-gray-500">
          {info.data.waiting === 0
            ? "Очередь пуста"
            : `В очереди уже ${info.data.waiting}`}
          {" · пациент будет "}
          <span className="font-medium text-gray-700">№{info.data.nextNumber}</span>
        </p>
      )}
    </>
  );
}
