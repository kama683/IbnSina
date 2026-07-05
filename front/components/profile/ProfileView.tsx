import Link from "next/link";
import ProfileContent from "@/components/profile/ProfileContent";
import { getDoctorProfile } from "@/lib/api/doctors";

export default async function ProfileView() {
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
