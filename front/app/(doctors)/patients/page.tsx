import Link from "next/link";
import PatientsContent from "@/components/patients/PatientsContent";
import { patients } from "@/lib/mock-data";

export default function PatientsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Пациенты</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Пациенты
        </h1>
      </div>

      <PatientsContent patients={patients} />
    </div>
  );
}
