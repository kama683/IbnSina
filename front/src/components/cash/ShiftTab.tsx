import { useQuery } from "@tanstack/react-query";
import CashRegisterContent from "@/components/cash/CashRegisterContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getCurrentShift, getShifts } from "@/lib/api/cash-shifts";

/** Вкладка «Смена»: открытие/закрытие, отчёт, история смен. */
export default function ShiftTab() {
  const shift = useQuery({
    queryKey: ["cash-shifts", "current"],
    queryFn: getCurrentShift,
  });
  const allShifts = useQuery({
    queryKey: ["cash-shifts", "list"],
    queryFn: getShifts,
  });

  return (
    <QueryBoundary queries={[shift, allShifts]}>
      {allShifts.data && (
        <div className="max-w-[700px]">
          <CashRegisterContent
            initialShift={shift.data ?? null}
            // Собственная открытая смена уже показана в карточке выше — в
            // истории её дублировать не нужно.
            shiftHistory={allShifts.data.filter((row) => row.id !== shift.data?.id)}
          />
        </div>
      )}
    </QueryBoundary>
  );
}
