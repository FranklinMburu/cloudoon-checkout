import { CYCLES, cycleLabel } from '../../data/catalog';
import { cyclePreview, freeDomainEligible } from '../../lib/pricing';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Badge, RadioCard, Section } from '../../components/ui';

export function BillingCycleSection() {
  const { cart, update } = useStore();
  const { fmt } = useMoney();

  return (
    <Section
      id="billing-period"
      title="Billing period"
      description="Longer terms lower your monthly price. You pay for the whole term today."
    >
      <fieldset>
        <legend className="sr-only">Billing period</legend>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {CYCLES.map((c) => {
            const p = cyclePreview(cart, c);
            const freeDomain = cart.category === 'shared' && c >= 12;
            return (
              <RadioCard key={c} name="cycle" value={String(c)} checked={cart.cycle === c} onChange={() => update({ cycle: c })} className="p-3 sm:p-4" label={cycleLabel(c)}>
                <span className="block font-semibold text-gray-950">{cycleLabel(c)}</span>
                <span className="mt-1 flex min-h-6 flex-wrap gap-1">
                  {p.discount > 0 ? <Badge tone="accent">Save {Math.round(p.discount * 100)}%</Badge> : <span className="text-xs text-gray-500">No discount</span>}
                </span>
                <span className="mt-2 block">
                  <span className="text-xl font-bold tracking-tight text-gray-950">{fmt(p.monthly)}</span>
                  <span className="text-sm text-gray-600">/mo</span>
                </span>
                <span className="block text-xs text-gray-600">
                  {c === 1 ? 'Billed monthly' : <>{fmt(p.total)} billed today</>}
                </span>
                {freeDomain && <span className="mt-1 block text-xs font-medium text-green-700">+ Free domain, 1st year</span>}
              </RadioCard>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-3 text-sm text-gray-600">
        Prices shown are for your hosting only. After the first term it renews at the regular rate of{' '}
        <strong className="font-semibold text-gray-900">{fmt(cyclePreview(cart, cart.cycle).regularMonthly)}/mo</strong>
        {cart.cycle > 1 && <> ({fmt(cyclePreview(cart, cart.cycle).regularMonthly * cart.cycle)} every {cart.cycle} months)</>}.
        {!freeDomainEligible(cart) && cart.category === 'shared' && ' Choose 12 months or longer to get a free domain.'}
      </p>
    </Section>
  );
}
