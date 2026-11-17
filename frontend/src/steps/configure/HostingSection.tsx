import { useState, type ReactNode } from 'react';
import {
  BANDWIDTH_PACKAGES,
  CATEGORIES,
  CLOUD_SIZES,
  DEDICATED_SERVERS,
  K8S_PRICING,
  LOCATIONS,
  MANAGED_FEATURES,
  OS_OPTIONS,
  SCALING_PRESETS,
  SHARED_PLANS,
  UNMANAGED_FEATURES,
  VPS_LIMITS,
  VPS_PRICING,
} from '../../data/catalog';
import { cloudBurstHourly, cyclePreview } from '../../lib/pricing';
import { fitVpsToOs, useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import type { ProductCategory, VpsConfig } from '../../types';
import { Cloud, Cpu, Layers, Server } from '../../components/icons';
import { Badge, FeatureList, ListGroup, Notice, RadioCard, RangeField, Section, Segmented, SubHeading, Switch, cx } from '../../components/ui';

const CATEGORY_ICONS: Record<ProductCategory, ReactNode> = {
  shared: <Layers size={18} />,
  vps: <Cpu size={18} />,
  dedicated: <Server size={18} />,
  cloud: <Cloud size={18} />,
};

export function HostingSection() {
  const { cart, update } = useStore();

  return (
    <Section id="hosting" title="Hosting">
      <fieldset>
        <legend className="sr-only">Hosting type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const on = cart.category === c.id;
            return (
              <label
                key={c.id}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1',
                  on ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600' : 'border-gray-200 hover:border-gray-400',
                )}
              >
                <input type="radio" name="category" className="sr-only" checked={on} onChange={() => update({ category: c.id })} />
                <span className={on ? 'text-brand-600' : 'text-gray-500'}>{CATEGORY_ICONS[c.id]}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-950">{c.label}</span>
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
  const { cart, update } = useStore();
  const { fmt } = useMoney();

  return (
    <fieldset>
      <legend className="contents"><SubHeading>Plan</SubHeading></legend>
      <div className="grid gap-2 md:grid-cols-3">
        {SHARED_PLANS.map((p) => {
          const pr = cyclePreview({ ...cart, category: 'shared', shared: { planId: p.id } }, cart.cycle);
          const on = cart.shared.planId === p.id;
          return (
            <RadioCard key={p.id} name="shared-plan" value={p.id} checked={on} onChange={() => update({ shared: { planId: p.id } })} label={p.name}>
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-950">{p.name}</span>
                {p.popular && <Badge tone="accent">Popular</Badge>}
              </span>
              <span className="mt-0.5 block text-[13px] text-gray-600">{p.description}</span>
              <span className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-xl font-semibold tracking-tight text-gray-950">{fmt(pr.monthly)}</span>
                <span className="text-[13px] text-gray-500">/mo</span>
                {pr.discount > 0 && <span className="text-[13px] text-gray-400 line-through">{fmt(pr.regularMonthly)}</span>}
              </span>
              <span className="block text-xs text-gray-500">Renews at {fmt(pr.regularMonthly)}/mo</span>
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
  const { cart, update } = useStore();
  const { usd } = useMoney();
  const v = cart.vps;
  const os = OS_OPTIONS.find((o) => o.id === v.os)!;
  const set = (patch: Partial<VpsConfig>) => update({ vps: fitVpsToOs({ ...v, ...patch }) });
  const ramIndex = VPS_LIMITS.ramSteps.indexOf(v.ram);

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
            { value: 'managed', label: `Managed · +${usd(VPS_PRICING.managed)}/mo` },
            { value: 'unmanaged', label: 'Unmanaged' },
          ]}
        />
        <FeatureList items={v.managed ? MANAGED_FEATURES : UNMANAGED_FEATURES} className="mt-3 grid gap-x-4 sm:grid-cols-2" />
      </div>

      <fieldset>
        <legend className="contents"><SubHeading>Operating system</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {OS_OPTIONS.map((o) => (
            <RadioCard key={o.id} name="vps-os" value={o.id} checked={v.os === o.id} onChange={() => set({ os: o.id })}>
              <span className="block text-sm font-medium text-gray-950">{o.name} {o.version}</span>
              <span className="block text-[13px] text-gray-600">{o.monthly ? `+${usd(o.monthly)}/mo licence` : 'No licence fee'}</span>
            </RadioCard>
          ))}
        </div>
        {v.os === 'windows' && (
          <Notice className="mt-3">Windows needs at least {os.minCpu} vCPU and {os.minRam} GB RAM. The licence is listed separately in your summary.</Notice>
        )}
      </fieldset>

      <div className="space-y-3">
        <SubHeading>Resources</SubHeading>
        <RangeField
          label="vCPU"
          value={v.cpu}
          min={VPS_LIMITS.cpu.min}
          max={VPS_LIMITS.cpu.max}
          onChange={(cpu) => set({ cpu })}
          display={`${v.cpu} vCPU`}
          price={`${usd(VPS_PRICING.perCpu)} each`}
          minLabel={`${VPS_LIMITS.cpu.min}`}
          maxLabel={`${VPS_LIMITS.cpu.max}`}
        />
        <RangeField
          label="Memory"
          value={ramIndex}
          min={0}
          max={VPS_LIMITS.ramSteps.length - 1}
          onChange={(i) => set({ ram: VPS_LIMITS.ramSteps[i] })}
          display={`${v.ram} GB`}
          valueText={`${v.ram} gigabytes`}
          price={`${usd(VPS_PRICING.perRamGb)}/GB`}
          minLabel={`${VPS_LIMITS.ramSteps[0]} GB`}
          maxLabel={`${VPS_LIMITS.ramSteps.at(-1)} GB`}
        />
        <RangeField
          label="NVMe storage"
          value={v.storage}
          min={VPS_LIMITS.storage.min}
          max={VPS_LIMITS.storage.max}
          step={VPS_LIMITS.storage.step}
          onChange={(storage) => set({ storage })}
          display={`${v.storage} GB`}
          price={`${usd(VPS_PRICING.perStorageGb * 100)}/100 GB`}
          minLabel={`${VPS_LIMITS.storage.min} GB`}
          maxLabel={`${VPS_LIMITS.storage.max} GB`}
        />
      </div>
    </div>
  );
}

/* ------------------------------- Dedicated ----------------------------- */

function DedicatedConfigurator() {
  const { cart, update } = useStore();
  const { usd } = useMoney();
  const d = cart.dedicated;
  const loc = LOCATIONS.find((l) => l.id === d.locationId)!;
  const set = (patch: Partial<typeof d>) => update({ dedicated: { ...d, ...patch } });
  const [switched, setSwitched] = useState('');

  // If the chosen server isn't stocked in the new location, move to one that is — and say so.
  const chooseLocation = (locationId: string) => {
    const server = DEDICATED_SERVERS.find((s) => s.id === d.serverId)!;
    const newLoc = LOCATIONS.find((l) => l.id === locationId)!;
    if (server.outOfStock.includes(locationId)) {
      const fallback = DEDICATED_SERVERS.find((s) => !s.outOfStock.includes(locationId))!;
      set({ locationId, serverId: fallback.id });
      setSwitched(`${server.name} isn’t available in ${newLoc.city}, so we selected ${fallback.name}.`);
    } else {
      set({ locationId });
      setSwitched('');
    }
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="contents"><SubHeading hint="Free setup">Data center</SubHeading></legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LOCATIONS.map((l) => (
            <RadioCard
              key={l.id}
              name="dc"
              value={l.id}
              checked={d.locationId === l.id}
              onChange={() => chooseLocation(l.id)}
              indicator={false}
              className="py-2.5"
            >
              <span className="block text-sm font-medium text-gray-950">{l.city}</span>
              <span className="block text-xs text-gray-500">{l.country}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading hint={`Stock in ${loc.city}`}>Server</SubHeading></legend>
        <div className="space-y-2">
          {DEDICATED_SERVERS.map((s) => {
            const out = s.outOfStock.includes(d.locationId);
            return (
              <RadioCard key={s.id} name="server" value={s.id} checked={d.serverId === s.id} disabled={out} onChange={() => { set({ serverId: s.id }); setSwitched(''); }} label={s.name}>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-950">
                      {s.name} {out && <Badge tone="danger">Out of stock here</Badge>}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-gray-600">{s.cpu}</span>
                    <span className="block text-[13px] text-gray-600">{s.ram} · {s.storage}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-gray-950 tabular-nums">{usd(s.monthly)}<span className="text-[13px] font-normal text-gray-500">/mo</span></span>
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
          {BANDWIDTH_PACKAGES.map((b) => (
            <RadioCard key={b.id} name="bw" value={b.id} checked={d.bandwidthId === b.id} onChange={() => set({ bandwidthId: b.id })}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-950">{b.name}</span>
                <span className="shrink-0 text-[13px] text-gray-600 tabular-nums">{b.monthly ? `+${usd(b.monthly)}/mo` : 'Included'}</span>
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
  const { cart, update } = useStore();
  const { usd, fmt } = useMoney();
  const c = cart.cloud;
  const scaling = SCALING_PRESETS.find((s) => s.id === c.scalingId)!;
  const set = (patch: Partial<typeof c>) => update({ cloud: { ...c, ...patch } });

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="contents"><SubHeading hint="Per instance">Instance size</SubHeading></legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {CLOUD_SIZES.map((s) => (
            <RadioCard key={s.id} name="size" value={s.id} checked={c.sizeId === s.id} onChange={() => set({ sizeId: s.id })}>
              <span className="block text-sm font-medium text-gray-950">{s.name}</span>
              <span className="block text-[13px] text-gray-600">{s.cpu} vCPU · {s.ram} GB</span>
              <span className="mt-1 block text-[13px] font-medium text-gray-950 tabular-nums">{usd(s.monthly)}<span className="font-normal text-gray-500">/mo</span></span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading>Autoscaling</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCALING_PRESETS.map((s) => (
            <RadioCard key={s.id} name="scaling" value={s.id} checked={c.scalingId === s.id} onChange={() => set({ scalingId: s.id })}>
              <span className="block text-sm font-medium text-gray-950">{s.name} <span className="font-normal text-gray-500">· {s.min === s.max ? '1 instance' : `${s.min}–${s.max}`}</span></span>
              <span className="block text-[13px] text-gray-600">{s.description}</span>
            </RadioCard>
          ))}
        </div>
        <Notice className="mt-3">
          Your price covers {scaling.min} {scaling.min === 1 ? 'instance' : 'instances'}.{' '}
          {scaling.max > scaling.min
            ? <>Extra instances (up to {scaling.max}) cost {fmt(cloudBurstHourly(cart), true)}/hour each while running, billed monthly.</>
            : <>No usage charges.</>}
        </Notice>
      </fieldset>

      <div>
        <SubHeading>Kubernetes</SubHeading>
        <ListGroup>
          <Switch
            checked={c.kubernetes}
            onChange={(kubernetes) => set({ kubernetes })}
            label="Managed Kubernetes"
            description="We run the control plane, upgrades and monitoring."
            price={`+${usd(K8S_PRICING.controlPlane)}/mo`}
          />
          {c.kubernetes && (
            <>
              <div className="pl-4"><Switch checked={c.k8sLoadBalancer} onChange={(k8sLoadBalancer) => set({ k8sLoadBalancer })} label="Load balancer" description="1 public IP, TLS termination" price={`+${usd(K8S_PRICING.loadBalancer)}/mo`} /></div>
              <div className="pl-4"><Switch checked={c.k8sRegistry} onChange={(k8sRegistry) => set({ k8sRegistry })} label="Container registry" description="50 GB private image storage" price={`+${usd(K8S_PRICING.registry)}/mo`} /></div>
            </>
          )}
        </ListGroup>
      </div>
    </div>
  );
}
