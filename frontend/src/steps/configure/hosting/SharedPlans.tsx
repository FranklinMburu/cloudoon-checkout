// Shared hosting: Web, WordPress and WooCommerce plans.

import { toNumber } from '../../../lib/format';
import { useStore } from '../../../state/store';
import { useMoney } from '../../../state/useMoney';
import { Badge, FeatureList, RadioCard, SubHeading, cx } from '../../../components/ui';

export function SharedPlans() {
  const { cart, catalog, update } = useStore();
  const { fmt } = useMoney();

  return (
    <fieldset>
      <legend className="contents"><SubHeading>Plan</SubHeading></legend>
      <div className="grid gap-2 md:grid-cols-3">
        {catalog.shared_plans.map((p) => {
          const on = cart.shared.plan === p.slug;
          return (
            <RadioCard key={p.slug} name="shared-plan" value={p.slug} checked={on} onChange={() => update({ shared: { plan: p.slug } })} label={p.name}>
              {/* Fixed rows so prices line up across the three cards. */}
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-950">{p.name}</span>
                {p.is_popular && <Badge tone="accent">Popular</Badge>}
              </span>
              <span className="mt-0.5 block text-[13px] text-gray-600 md:min-h-10">{p.description}</span>
              <span className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-xl font-semibold tracking-tight text-gray-950">{fmt(p.monthly)}</span>
                <span className="text-[13px] text-gray-500">/mo</span>
                {toNumber(p.discount) > 0 && <span className="text-[13px] text-gray-500 line-through">{fmt(p.regular_monthly)}</span>}
              </span>
              <span className="block text-xs text-gray-500">Renews at {fmt(p.regular_monthly)}/mo</span>
              {/* Progressive disclosure on phones: only the selected plan lists its features. */}
              <FeatureList items={p.features} className={cx('mt-3 border-t border-gray-100 pt-3', !on && 'hidden md:block')} />
            </RadioCard>
          );
        })}
      </div>
    </fieldset>
  );
}
