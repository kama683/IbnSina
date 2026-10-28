import AvatarPicker from "@/components/profile/AvatarPicker";
import { ROLE_LABELS } from "@/lib/roles";
import type { Employee } from "@/lib/api/employees";

/** Профиль сотрудника без профиля врача (регистратура, медсестра, бухгалтер,
 * админ): у него есть только учётная запись. */
export default function AccountCard({ employee }: { employee: Employee }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-4 px-5 py-5">
        <AvatarPicker
          initials={employee.initials}
          avatarUrl={employee.avatarUrl}
          className="h-16 w-16 text-xl"
        />
        <div>
          <h2 className="text-base font-semibold text-gray-900">{employee.fullName}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {employee.positionTitle || ROLE_LABELS[employee.role]}
          </p>
        </div>
      </div>
    </section>
  );
}
