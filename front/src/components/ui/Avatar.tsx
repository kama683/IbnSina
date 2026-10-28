type Props = {
  url?: string | null;
  initials: string;
  /** Размер, шрифт инициалов и прочее — классами (h-9 w-9 text-[13px] …). */
  className?: string;
};

/** Круглая аватарка сотрудника: фото, а если его нет — инициалы. */
export default function Avatar({ url, initials, className = "" }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f5ee] font-semibold text-[#1a5c3a] ${className}`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
