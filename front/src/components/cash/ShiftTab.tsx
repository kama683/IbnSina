import { useQuery } from "@tanstack/react-query";
import CashRegisterContent from "@/components/cash/CashRegisterContent";
import PaymentMethodsCard from "@/components/cash/PaymentMethodsCard";
import ShiftKpis from "@/components/cash/ShiftKpis";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getCurrentShift, getShifts } from "@/lib/api/cash-shifts";

/** Вкладка «Смена»: цифры смены, открытие/закрытие, способы оплаты, история. */
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
    <div className="space-y-5">
      <ShiftKpis />
      <QueryBoundary queries={[shift, allShifts]}>
        {allShifts.data && (
          <CashRegisterContent
            initialShift={shift.data ?? null}
            // Собственная открытая смена уже показана в карточке выше — в
            // истории её дублировать не нужно.
            shiftHistory={allShifts.data.filter((row) => row.id !== shift.data?.id)}
            aside={<PaymentMethodsCard />}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
