import { Navigate, useLocation } from "react-router-dom";
import AppointmentsPage from "@/pages/AppointmentsPage";
import { useEmployee } from "@/lib/auth/employee-context";

/** /appointments: у регистратуры — отдельная страница приёмов; у врача, главврача
 * и медсестры приёмы объединены с дашбордом, поэтому ведём на «/» вместе с
 * параметрами (дата, неделя). */
export default function AppointmentsRoute() {
  const employee = useEmployee();
  const { search } = useLocation();

  if (employee.role === "reception") return <AppointmentsPage />;
  return <Navigate to={{ pathname: "/", search }} replace />;
}
