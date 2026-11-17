import type { Cycle } from '../../api/types';
import { toNumber } from '../../lib/format';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Badge, RadioCard, Section, Skeleton } from '../../components/ui';

const cycleLabel = (c: number) => (c === 1 ? '1 month' : `${c} months`);

export function BillingCycleSection() {
  const { cart, catalog, quote, update } = useStore();
  const { fmt } = useMoney();
  const options = quote?.cycle_options;
  const current = options?.find((o) => o.months === cart.cycle);

  if (cart.category === 'none') {
    return <Section id="billing-period" title="Billing period" description="Domains are registered for a year at a time and renew yearly." />;
  }

  return (
    <Section id="billing-period" title="Billing period" description="Pay for the full term today. Longer terms cost less per month.">
      <fieldset>
        <legend className="sr-only">Billing period</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {catalog.cycles.map((c: Cycle) => {
            const p = options?.find((o) => o.months === c);
            return (
              <RadioCard key={c} name="cycle" value={String(c)} checked={cart.cycle === c} onChange={() => update({ cycle: c })} label={cycleLabel(c)} indicator={false}>
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="text-sm font-medium whitespace-nowrap text-gray-950">{cycleLabel(c)}</span>
                  {p && toNumber(p.discount) > 0 && <Badge tone="accent">Save {Math.round(toNumber(p.discount) * 100)}%</Badge>}
                </span>
                {p ? (
                  <>
                    <span className="mt-1.5 block tabular-nums">
                      <span className="text-base font-semibold text-gray-950">{fmt(p.monthly)}</span>
                      <span className="text-[13px] text-gray-500">/mo</span>
                    </span>
                    <span className="block text-xs text-gray-500 tabular-nums">{c === 1 ? 'Billed monthly' : `${fmt(p.total)} today`}</span>
                  </>
                ) : (
                  <span className="mt-2 block space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></span>
                )}
              </RadioCard>
            );
          })}
        </div>
      </fieldset>
      {current && quote && (
        <p className="mt-3 text-[13px] text-gray-600">
          Renews at {fmt(current.regular_monthly)}/mo
          {cart.cycle > 1 && <> ({fmt(quote.lines[0].renewal?.amount ?? 0)} every {cart.cycle} months)</>}.
          {cart.category === 'shared' && (quote.free_domain.eligible ? ' Includes a free domain for the first year.' : ' Choose 12+ months to get a free domain.')}
        </p>
      )}
    </Section>
  );
}
