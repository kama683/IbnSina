import { Navigate, useSearchParams } from "react-router-dom";
import ShiftTab from "@/components/cash/ShiftTab";

/** Индекс /cash-register. Вкладки раньше выбирались через ?tab=invoices —
 * старые закладки ведут на новые адреса. */
export default function ShiftRoute() {
  const [searchParams] = useSearchParams();
  const legacy = searchParams.get("tab");
  if (legacy === "invoices" || legacy === "requests") {
    return <Navigate to={`/cash-register/${legacy}`} replace />;
  }
  return <ShiftTab />;
}
