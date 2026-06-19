import Link from "next/link";
import ProfileContactsCard from "@/components/profile/ProfileContactsCard";
import ProfileEducationCard from "@/components/profile/ProfileEducationCard";
import ProfileMetricsCard from "@/components/profile/ProfileMetricsCard";
import ProfileProfessionalCard from "@/components/profile/ProfileProfessionalCard";
import ProfileScheduleCard from "@/components/profile/ProfileScheduleCard";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";

export default function ProfileView() {
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <ProfileSummaryCard />
          <ProfileContactsCard />
          <ProfileMetricsCard />
        </div>

        <div className="space-y-5">
          <ProfileProfessionalCard />
          <ProfileScheduleCard />
        </div>
      </div>

      <ProfileEducationCard />

      <div className="flex flex-wrap justify-end gap-3 pb-2">
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Отменить
        </button>
        <button
          type="button"
          className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}
