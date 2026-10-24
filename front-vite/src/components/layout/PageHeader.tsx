import { Link } from "react-router-dom";

type Props = {
  title: string;
  /** Цепочка между «Главная» и текущей страницей, например
   * [{ label: "Пациенты", to: "/patients" }]. */
  crumbs?: { label: string; to: string }[];
  /** Подпись в хлебных крошках, если она короче заголовка. */
  current?: string;
};

/** Хлебные крошки + заголовок — общий верх страниц (раньше копировался в
 * каждый page.tsx). */
export default function PageHeader({ title, crumbs = [], current }: Props) {
  return (
    <div>
      <p className="text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-600">
          Главная
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.to}>
            {" / "}
            <Link to={crumb.to} className="hover:text-gray-600">
              {crumb.label}
            </Link>
          </span>
        ))}
        {" / "}
        <span className="text-gray-600">{current ?? title}</span>
      </p>
      <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
        {title}
      </h1>
    </div>
  );
}
