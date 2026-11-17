import { useState, type ReactNode } from 'react';
import type { CartState, ProductCategory } from '../../api/types';
import { toNumber } from '../../lib/format';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Cloud, Cpu, Layers, Server } from '../../components/icons';
import { Badge, FeatureList, ListGroup, Notice, RadioCard, RangeField, Section, Segmented, SubHeading, Switch, cx } from '../../components/ui';

const CATEGORY_ICONS: Record<ProductCategory, ReactNode> = {
  shared: <Layers size={18} />,
  vps: <Cpu size={18} />,
  dedicated: <Server size={18} />,
  cloud: <Cloud size={18} />,
};

export function HostingSection() {
  const { cart, catalog, update } = useStore();

  return (
    <Section id="hosting" title="Hosting">
      <fieldset>
        <legend className="sr-only">Hosting type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {catalog.categories.map((c) => {
            const on = cart.category === c.slug;
            return (
              <label
                key={c.slug}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1',
                  on ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600' : 'border-gray-200 hover:border-gray-400',
                )}
              >
                <input type="radio" name="category" className="sr-only" checked={on} onChange={() => update({ category: c.slug })} />
                <span className={on ? 'text-brand-600' : 'text-gray-500'}>{CATEGORY_ICONS[c.slug]}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-950">{c.name}</span>
                  <span className="hidden text-xs text-gray-500 sm:block">{c.tagline}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        {cart.category === 'shared' && <SharedPlans />}
        {cart.category === 'vps' && <VpsConfigurator />}
        {cart.category === 'dedicated' && <DedicatedConfigurator />}
        {cart.category === 'cloud' && <CloudConfigurator />}
      </div>
    </Section>
  );
}

/* -------------------------------- Shared ------------------------------- */

function SharedPlans() {
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

/* ---------------------------------- VPS -------------------------------- */

function VpsConfigurator() {
  const { cart, catalog, update } = useStore();
  const { fmt } = useMoney();
  const v = cart.vps;
  const p = catalog.vps;
  const os = p.operating_systems.find((o) => o.slug === v.os) ?? p.operating_systems[0];

  // Keep resources valid for the chosen OS (the API rejects e.g. Windows with 1 vCPU).
  const set = (patch: Partial<CartState['vps']>) => {
    const next = { ...v, ...patch };
    const target = p.operating_systems.find((o) => o.slug === next.os) ?? os;
    update({ vps: { ...next, cpu: Math.max(next.cpu, target.min_cpu), ram: Math.max(next.ram, target.min_ram_gb) } });
  };
  const ramIndex = Math.max(0, p.ram_steps.indexOf(v.ram));

  return (
    <div className="space-y-6">
      <div>
        <SubHeading>Management</SubHeading>
        <Segmented
          label="Management"
          fullWidth
          value={v.managed ? 'managed' : 'unmanaged'}
          onChange={(val) => set({ managed: val === 'managed' })}
          options={[
            { value: 'managed', label: `Managed · +${fmt(p.managed_fee)}/mo` },
            { value: 'unmanaged', label: 'Unmanaged' },
          ]}
        />
        <FeatureList items={v.managed ? p.managed_features : p.unmanaged_features} className="mt-3 grid gap-x-4 sm:grid-cols-2" />
      </div>

      <fieldset>
        <legend className="contents"><SubHeading>Operating system</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {p.operating_systems.map((o) => (
            <RadioCard key={o.slug} name="vps-os" value={o.slug} checked={v.os === o.slug} onChange={() => set({ os: o.slug })}>
              <span className="block text-sm font-medium text-gray-950">{o.name}</span>
              <span className="block text-[13px] text-gray-600">{o.version}</span>
              {toNumber(o.monthly) > 0 && <span className="mt-0.5 block text-[13px] text-gray-700">+{fmt(o.monthly)}/mo licence</span>}
            </RadioCard>
          ))}
        </div>
        {os.min_cpu > 1 && (
          <Notice className="mt-3">{os.name} needs at least {os.min_cpu} vCPU and {os.min_ram_gb} GB RAM. The licence is listed separately in your summary.</Notice>
        )}
      </fieldset>

      <div className="space-y-3">
        <SubHeading>Resources</SubHeading>
        <RangeField
          label="vCPU"
          value={v.cpu}
          min={p.cpu.min}
          max={p.cpu.max}
          onChange={(cpu) => set({ cpu })}
          display={`${v.cpu} vCPU`}
          price={`${fmt(p.per_cpu)} each`}
          minLabel={`${p.cpu.min}`}
          maxLabel={`${p.cpu.max}`}
        />
        <RangeField
          label="Memory"
          value={ramIndex}
          min={0}
          max={p.ram_steps.length - 1}
          onChange={(i) => set({ ram: p.ram_steps[i] })}
          display={`${v.ram} GB`}
          valueText={`${v.ram} gigabytes`}
          price={`${fmt(p.per_ram_gb)}/GB`}
          minLabel={`${p.ram_steps[0]} GB`}
          maxLabel={`${p.ram_steps[p.ram_steps.length - 1]} GB`}
        />
        <RangeField
          label="NVMe storage"
          value={v.storage}
          min={p.storage.min}
          max={p.storage.max}
          step={p.storage.step}
          onChange={(storage) => set({ storage })}
          display={`${v.storage} GB`}
          price={`${fmt(p.per_100gb_storage)}/100 GB`}
          minLabel={`${p.storage.min} GB`}
          maxLabel={`${p.storage.max} GB`}
        />
      </div>
    </div>
  );
}

/* ------------------------------- Dedicated ----------------------------- */

function DedicatedConfigurator() {
  const { cart, catalog, update } = useStore();
  const { fmt } = useMoney();
  const d = cart.dedicated;
  const { datacenters, servers, bandwidth } = catalog.dedicated;
  const loc = datacenters.find((l) => l.slug === d.location) ?? datacenters[0];
  const set = (patch: Partial<CartState['dedicated']>) => update({ dedicated: { ...d, ...patch } });
  const [switched, setSwitched] = useState('');

  // If the chosen server isn't stocked in the new location, move to one that is — and say so.
  const chooseLocation = (location: string) => {
    const server = servers.find((s) => s.slug === d.server)!;
    const newLoc = datacenters.find((l) => l.slug === location)!;
    if (server.out_of_stock_at.includes(location)) {
      const fallback = servers.find((s) => !s.out_of_stock_at.includes(location))!;
      set({ location, server: fallback.slug });
      setSwitched(`${server.name} isn’t available in ${newLoc.city}, so we selected ${fallback.name}.`);
    } else {
      set({ location });
      setSwitched('');
    }
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="contents"><SubHeading hint="Free setup">Data center</SubHeading></legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {datacenters.map((l) => (
            <RadioCard key={l.slug} name="dc" value={l.slug} checked={d.location === l.slug} onChange={() => chooseLocation(l.slug)} indicator={false} className="py-2.5">
              <span className="block text-sm font-medium text-gray-950">{l.city}</span>
              <span className="block text-xs text-gray-500">{l.country}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading hint={`Stock in ${loc.city}`}>Server</SubHeading></legend>
        <div className="space-y-2">
          {servers.map((s) => {
            const out = s.out_of_stock_at.includes(d.location);
            return (
              <RadioCard key={s.slug} name="server" value={s.slug} checked={d.server === s.slug} disabled={out} onChange={() => { set({ server: s.slug }); setSwitched(''); }} label={s.name}>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-950">
                      {s.name} {out && <Badge tone="danger">Out of stock here</Badge>}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-gray-600">{s.cpu}</span>
                    <span className="block text-[13px] text-gray-600">{s.ram} · {s.storage}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-gray-950 tabular-nums">{fmt(s.monthly)}<span className="text-[13px] font-normal text-gray-500">/mo</span></span>
                </span>
              </RadioCard>
            );
          })}
        </div>
        {switched && <Notice tone="warning" className="mt-3">{switched}</Notice>}
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading>Bandwidth</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {bandwidth.map((b) => (
            <RadioCard key={b.slug} name="bw" value={b.slug} checked={d.bandwidth === b.slug} onChange={() => set({ bandwidth: b.slug })}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-950">{b.name}</span>
                <span className="shrink-0 text-[13px] text-gray-600 tabular-nums">{toNumber(b.monthly) > 0 ? `+${fmt(b.monthly)}/mo` : 'Included'}</span>
              </span>
            </RadioCard>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/* --------------------------------- Cloud ------------------------------- */

function CloudConfigurator() {
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
