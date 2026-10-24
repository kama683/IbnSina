import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import CashRegisterContent from "@/components/cash/CashRegisterContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getCurrentShift, getShifts } from "@/lib/api/cash-shifts";

// Доступ по роли (MANAGE_CASH_ROLES) проверяет <RequireRole> в router.tsx.
export default function CashRegisterPage() {
  const shift = useQuery({
    queryKey: ["cash-shifts", "current"],
    queryFn: getCurrentShift,
  });
  const allShifts = useQuery({
    queryKey: ["cash-shifts", "list"],
    queryFn: getShifts,
  });

  return (
    <div className="mx-auto max-w-[700px] space-y-5">
      <PageHeader title="Касса" />

      <QueryBoundary queries={[shift, allShifts]}>
        {allShifts.data && (
          <CashRegisterContent
            initialShift={shift.data ?? null}
            // Собственная открытая смена уже показана в карточке выше — в
            // истории её дублировать не нужно.
            shiftHistory={allShifts.data.filter((row) => row.id !== shift.data?.id)}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
