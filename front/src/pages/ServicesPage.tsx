import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import ServicesContent from "@/components/services/ServicesContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getServices } from "@/lib/api/services";
import { useEmployee } from "@/lib/auth/employee-context";
import { MANAGE_SERVICES_ROLES } from "@/lib/roles";

// Доступ по роли (VIEW_SERVICES_ROLES) проверяет <RequireRole> в router.tsx.
export default function ServicesPage() {
  const employee = useEmployee();
  // includeInactive для тех, кто управляет услугами (включает/выключает).
  const includeInactive = MANAGE_SERVICES_ROLES.includes(employee.role);

  const services = useQuery({
    queryKey: ["services", { includeInactive }],
    queryFn: () => getServices(includeInactive),
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Регистратору это справочник цен (управлять услугами он не может) */}
      <PageHeader title={employee.role === "reception" ? "Прейскурант" : "Услуги"} />

      <QueryBoundary queries={[services]}>
        {services.data && (
          <ServicesContent
            initialServices={services.data}
            currentEmployeeRole={employee.role}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
