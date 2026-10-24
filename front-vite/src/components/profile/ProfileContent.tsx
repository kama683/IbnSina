import { useRefresh } from "@/lib/use-refresh";
import { useState } from "react";
import ProfileContactsCard from "@/components/profile/ProfileContactsCard";
import ProfileEducationCard from "@/components/profile/ProfileEducationCard";
import ProfileMetricsCard from "@/components/profile/ProfileMetricsCard";
import ProfileProfessionalCard from "@/components/profile/ProfileProfessionalCard";
import ProfileScheduleCard from "@/components/profile/ProfileScheduleCard";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";
import { updateDoctorProfile, type DoctorProfile } from "@/lib/api/doctors";
import type { WorkDaySchedule } from "@/lib/types";

type Props = {
  profile: DoctorProfile;
};

export default function ProfileContent({ profile }: Props) {
  const refresh = useRefresh();
  const [about, setAbout] = useState(profile.professional.about);
  const [phone, setPhone] = useState(profile.contacts.phone);
  const [email, setEmail] = useState(profile.contacts.email);
  const [schedule, setSchedule] = useState<WorkDaySchedule[]>(profile.schedule);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      await updateDoctorProfile({ about, phone, email, schedule });
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить профиль",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setAbout(profile.professional.about);
    setPhone(profile.contacts.phone);
    setEmail(profile.contacts.email);
    setSchedule(profile.schedule);
    setError(null);
    void refresh();
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <ProfileSummaryCard profile={profile} />
          <ProfileContactsCard
            phone={phone}
            email={email}
            workplace={profile.contacts.workplace}
            onPhoneChange={setPhone}
            onEmailChange={setEmail}
          />
          <ProfileMetricsCard metrics={profile.metrics} />
        </div>

        <div className="space-y-5">
          <ProfileProfessionalCard
            professional={profile.professional}
            about={about}
            onAboutChange={setAbout}
          />
          <ProfileScheduleCard schedule={schedule} onScheduleChange={setSchedule} />
        </div>
      </div>

      <ProfileEducationCard education={profile.education} />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 pb-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Отменить
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e] disabled:opacity-50"
        >
          Сохранить изменения
        </button>
      </div>
    </>
  );
}
