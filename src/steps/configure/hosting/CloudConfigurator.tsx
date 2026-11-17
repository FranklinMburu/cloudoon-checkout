// Cloud: instance size, autoscaling preset and managed Kubernetes add-ons.

import type { CartState } from '../../../api/types';
import { useStore } from '../../../state/store';
import { useMoney } from '../../../state/useMoney';
import { ListGroup, Notice, RadioCard, SubHeading, Switch } from '../../../components/ui';

export function CloudConfigurator() {
  const { cart, catalog, quote, update } = useStore();
  const { fmt, fmtPrecise } = useMoney();
  const c = cart.cloud;
  const { sizes, scaling_presets } = catalog.cloud;
  const scaling = scaling_presets.find((s) => s.slug === c.scaling) ?? scaling_presets[0];
  const addon = (slug: string) => catalog.addons.find((a) => a.slug === slug)!;
  const set = (patch: Partial<CartState['cloud']>) => update({ cloud: { ...c, ...patch } });

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="contents"><SubHeading hint="Per instance">Instance size</SubHeading></legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {sizes.map((s) => (
            <RadioCard key={s.slug} name="size" value={s.slug} checked={c.size === s.slug} onChange={() => set({ size: s.slug })}>
              <span className="block text-sm font-medium text-gray-950">{s.name}</span>
              <span className="block text-[13px] text-gray-600">{s.cpu} vCPU · {s.ram_gb} GB</span>
              <span className="mt-1 block text-[13px] font-medium text-gray-950 tabular-nums">{fmt(s.monthly)}<span className="font-normal text-gray-500">/mo</span></span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading>Autoscaling</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {scaling_presets.map((s) => (
            <RadioCard key={s.slug} name="scaling" value={s.slug} checked={c.scaling === s.slug} onChange={() => set({ scaling: s.slug })}>
              <span className="block text-sm font-medium text-gray-950">{s.name} <span className="font-normal text-gray-500">· {s.min === s.max ? '1 instance' : `${s.min}–${s.max}`}</span></span>
              <span className="block text-[13px] text-gray-600">{s.description}</span>
            </RadioCard>
          ))}
        </div>
        <Notice className="mt-3">
          Your price covers {scaling.min} {scaling.min === 1 ? 'instance' : 'instances'}.{' '}
          {scaling.max > scaling.min
            ? <>Extra instances (up to {scaling.max}) cost {quote?.cloud_burst_hourly ? fmtPrecise(quote.cloud_burst_hourly) : '…'}/hour each while running, billed monthly.</>
            : <>No usage charges.</>}
        </Notice>
      </fieldset>

      <div>
        <SubHeading>Kubernetes</SubHeading>
        <ListGroup>
          <Switch checked={c.kubernetes} onChange={(kubernetes) => set({ kubernetes })} label={addon('k8s-control-plane').name} description={addon('k8s-control-plane').description} price={`+${fmt(addon('k8s-control-plane').monthly)}/mo`} />
          {c.kubernetes && (
            <>
              <div className="pl-4"><Switch checked={c.k8s_load_balancer} onChange={(k8s_load_balancer) => set({ k8s_load_balancer })} label={addon('k8s-load-balancer').name} description={addon('k8s-load-balancer').description} price={`+${fmt(addon('k8s-load-balancer').monthly)}/mo`} /></div>
              <div className="pl-4"><Switch checked={c.k8s_registry} onChange={(k8s_registry) => set({ k8s_registry })} label={addon('k8s-registry').name} description={addon('k8s-registry').description} price={`+${fmt(addon('k8s-registry').monthly)}/mo`} /></div>
            </>
          )}
        </ListGroup>
      </div>
    </div>
  );
}
