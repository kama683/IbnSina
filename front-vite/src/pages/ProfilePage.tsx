import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import ProfileContent from "@/components/profile/ProfileContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getDoctorProfile } from "@/lib/api/doctors";

// Доступ по роли (HAS_DOCTOR_PROFILE_ROLES) проверяет <RequireRole> в router.tsx:
// профиль врача есть только у doctor/head_doctor.
export default function ProfilePage() {
  const profile = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: getDoctorProfile,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader title="Профиль врача" current="Профиль" />

      <QueryBoundary queries={[profile]}>
        {profile.data && <ProfileContent profile={profile.data} />}
      </QueryBoundary>
    </div>
  );
}
