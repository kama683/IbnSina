import Link from "next/link";
import ProfileContent from "@/components/profile/ProfileContent";
import { getDoctorProfile } from "@/lib/api/doctors";
import { getCurrentEmployee } from "@/lib/api/employees";
import { HAS_DOCTOR_PROFILE_ROLES } from "@/lib/roles";

export default async function ProfileView() {
  const employee = await getCurrentEmployee();

  if (!HAS_DOCTOR_PROFILE_ROLES.includes(employee.role)) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <span className="text-gray-600">Профиль</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
            Профиль
          </h1>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Раздел «Профиль врача» доступен только сотрудникам с врачебным
          профилем. Для вашей роли карточка сотрудника появится на
          следующих этапах.
        </div>
      </div>
    );
  }

  const profile = await getDoctorProfile();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Профиль</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Профиль врача
        </h1>
      </div>

      <ProfileContent profile={profile} />
    </div>
  );
}
