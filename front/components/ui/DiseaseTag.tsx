import type { DiseaseTagVariant } from "@/lib/mock-data";

const variantStyles: Record<DiseaseTagVariant, string> = {
  green: "bg-[#e8f5ee] text-[#1a5c3a]",
  purple: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
  yellow: "bg-amber-50 text-amber-700",
};

type Props = {
  label: string;
  variant: DiseaseTagVariant;
};

export default function DiseaseTag({ label, variant }: Props) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
