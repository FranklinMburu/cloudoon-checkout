import { CYCLES, cycleLabel } from '../../data/catalog';
import { cyclePreview } from '../../lib/pricing';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Badge, RadioCard, Section } from '../../components/ui';

export function BillingCycleSection() {
  const { cart, update } = useStore();
  const { fmt } = useMoney();
  const current = cyclePreview(cart, cart.cycle);

  return (
    <Section id="billing-period" title="Billing period" description="Pay for the full term today. Longer terms cost less per month.">
      <fieldset>
        <legend className="sr-only">Billing period</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {CYCLES.map((c) => {
            const p = cyclePreview(cart, c);
            return (
              <RadioCard key={c} name="cycle" value={String(c)} checked={cart.cycle === c} onChange={() => update({ cycle: c })} label={cycleLabel(c)} indicator={false}>
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="text-sm font-medium whitespace-nowrap text-gray-950">{cycleLabel(c)}</span>
                  {p.discount > 0 && <Badge tone="accent">Save {Math.round(p.discount * 100)}%</Badge>}
                </span>
                <span className="mt-1.5 block tabular-nums">
                  <span className="text-base font-semibold text-gray-950">{fmt(p.monthly)}</span>
                  <span className="text-[13px] text-gray-500">/mo</span>
                </span>
                <span className="block text-xs text-gray-500 tabular-nums">{c === 1 ? 'Billed monthly' : `${fmt(p.total)} today`}</span>
              </RadioCard>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-3 text-[13px] text-gray-600">
        Renews at {fmt(current.regularMonthly)}/mo
        {cart.cycle > 1 && <> ({fmt(current.regularMonthly * cart.cycle)} every {cart.cycle} months)</>}.
        {cart.category === 'shared' && (cart.cycle >= 12 ? ' Includes a free domain for the first year.' : ' Choose 12+ months to get a free domain.')}
      </p>
    </Section>
  );
}
