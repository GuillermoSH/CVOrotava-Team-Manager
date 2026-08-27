import QuotaMonthBoard from "@/components/payments/QuotaMonthBoard";
import QuotaStatusPanel from "@/components/payments/QuotaStatusPanel";
import type { QuotaItem } from "@/components/payments/quotaDates";

type QuotaSeasonLayoutProps = {
  pending: number;
  paid: number;
  quotas: QuotaItem[];
  children?: React.ReactNode;
};

export default function QuotaSeasonLayout({
  pending,
  paid,
  quotas,
  children,
}: QuotaSeasonLayoutProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <QuotaStatusPanel pending={pending} paid={paid} quotas={quotas} />
      <QuotaMonthBoard quotas={quotas} />
      {children}
    </div>
  );
}
