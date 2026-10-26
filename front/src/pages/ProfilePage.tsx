import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import AccountCard from "@/components/profile/AccountCard";
import ProfileContent from "@/components/profile/ProfileContent";
import SettingsSections from "@/components/settings/SettingsSections";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { useEmployee } from "@/lib/auth/employee-context";
import { getDoctorProfile } from "@/lib/api/doctors";
import { HAS_DOCTOR_PROFILE_ROLES } from "@/lib/roles";

// «Профиль» и «Настройки» — одна страница для всех ролей. Профиль врача
// (контакты, график, о себе) есть только у doctor/head_doctor, остальным
// показывается карточка учётной записи; блок настроек общий.
export default function ProfilePage() {
  const employee = useEmployee();
  const hasDoctorProfile = HAS_DOCTOR_PROFILE_ROLES.includes(employee.role);

  const profile = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: getDoctorProfile,
    enabled: hasDoctorProfile,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader title="Профиль" />

      {hasDoctorProfile ? (
        <QueryBoundary queries={[profile]}>
          {profile.data && (
            <ProfileContent profile={profile.data}>
              <SettingsSections />
            </ProfileContent>
          )}
        </QueryBoundary>
      ) : (
        <>
          <AccountCard employee={employee} />
          <SettingsSections />
        </>
      )}
    </div>
  );
}
