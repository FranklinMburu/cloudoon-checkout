import type { ReactNode } from 'react';
import {
  BANDWIDTH_PACKAGES,
  CATEGORIES,
  CLOUD_SIZES,
  CYCLE_DISCOUNTS,
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
  cycleLabel,
} from '../../data/catalog';
import { cloudBurstHourly, cyclePreview } from '../../lib/pricing';
import { fitVpsToOs, useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import type { ProductCategory, VpsConfig } from '../../types';
import { Check, Cloud, Cpu, Layers, Server } from '../../components/icons';
import { Badge, Notice, RadioCard, RangeField, Section, Segmented, Switch } from '../../components/ui';

const CATEGORY_ICONS: Record<ProductCategory, ReactNode> = {
  shared: <Layers size={22} />,
  vps: <Cpu size={22} />,
  dedicated: <Server size={22} />,
  cloud: <Cloud size={22} />,
};

export function HostingSection() {
  const { cart, update } = useStore();

  return (
    <Section id="hosting" title="Choose your hosting" description="Pick a type, then a plan. You can switch at any time — your choices are kept.">
      <fieldset>
        <legend className="sr-only">Hosting type</legend>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <RadioCard key={c.id} name="category" value={c.id} checked={cart.category === c.id} onChange={() => update({ category: c.id })} className="p-3 sm:p-4">
              <span className={cart.category === c.id ? 'text-brand-700' : 'text-gray-600'}>{CATEGORY_ICONS[c.id]}</span>
              <span className="mt-2 block font-semibold text-gray-950">{c.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-gray-600">{c.tagline}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 border-t border-gray-100 pt-6">
        {cart.category === 'shared' && <SharedPlans />}
        {cart.category === 'vps' && <VpsConfigurator />}
        {cart.category === 'dedicated' && <DedicatedConfigurator />}
        {cart.category === 'cloud' && <CloudConfigurator />}
      </div>
    </Section>
  );
}

function SubHeading({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-semibold text-gray-950">{children}</h3>
      {hint && <span className="text-sm text-gray-600">{hint}</span>}
    </div>
  );
}

/* -------------------------------- Shared ------------------------------- */

function SharedPlans() {
  const { cart, update } = useStore();
  const { fmt } = useMoney();
  const discount = CYCLE_DISCOUNTS.shared[cart.cycle];

  return (
    <fieldset>
      <legend className="contents"><SubHeading hint={`Prices for ${cycleLabel(cart.cycle)} billing`}>Shared hosting plan</SubHeading></legend>
      <div className="grid gap-3 md:grid-cols-3">
        {SHARED_PLANS.map((p) => {
          const pr = cyclePreview({ ...cart, category: 'shared', shared: { planId: p.id } }, cart.cycle);
          return (
            <RadioCard key={p.id} name="shared-plan" value={p.id} checked={cart.shared.planId === p.id} onChange={() => update({ shared: { planId: p.id } })} label={p.name}>
              <span className="flex min-h-6 flex-wrap gap-1.5 pr-6">
                {p.popular && <Badge tone="accent">Most popular</Badge>}
                {discount > 0 && <Badge tone="brand">Save {Math.round(discount * 100)}%</Badge>}
              </span>
              <span className="mt-2 block text-base font-semibold text-gray-950">{p.name}</span>
              <span className="mt-1 block text-sm text-gray-600">{p.description}</span>
              <span className="mt-3 block">
                <span className="text-2xl font-bold tracking-tight text-gray-950">{fmt(pr.monthly)}</span>
                <span className="text-sm text-gray-600">/mo</span>
                {discount > 0 && <span className="ml-2 text-sm text-gray-500 line-through">{fmt(pr.regularMonthly)}</span>}
              </span>
              <span className="block text-xs text-gray-600">
                {fmt(pr.total)} billed {cart.cycle === 1 ? 'monthly' : `every ${cart.cycle} months`} · renews at {fmt(pr.regularMonthly)}/mo
              </span>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-green-700" />{f}</li>
                ))}
              </ul>
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
            { value: 'managed', label: `Managed  +${usd(VPS_PRICING.managed)}/mo` },
            { value: 'unmanaged', label: 'Unmanaged' },
          ]}
        />
        <ul className="mt-3 grid gap-1.5 text-sm text-gray-700 sm:grid-cols-2">
          {(v.managed ? MANAGED_FEATURES : UNMANAGED_FEATURES).map((f) => (
            <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-green-700" />{f}</li>
          ))}
        </ul>
      </div>

      <fieldset>
        <legend className="contents"><SubHeading>Operating system</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {OS_OPTIONS.map((o) => (
            <RadioCard key={o.id} name="vps-os" value={o.id} checked={v.os === o.id} onChange={() => set({ os: o.id })} className="p-3">
              <span className="block font-semibold text-gray-950">{o.name}</span>
              <span className="block text-sm text-gray-600">{o.version}</span>
              <span className="mt-1 block text-sm font-medium text-gray-900">{o.monthly ? `+${usd(o.monthly)}/mo licence` : 'Free'}</span>
            </RadioCard>
          ))}
        </div>
        {v.os === 'windows' && (
          <Notice className="mt-3">Windows Server needs at least {os.minCpu} vCPU and {os.minRam} GB RAM, so smaller sizes are unavailable. The licence is listed separately in your summary.</Notice>
        )}
      </fieldset>

      <div className="space-y-5">
        <SubHeading hint="Drag or use arrow keys">Resources</SubHeading>
        <RangeField
          label="vCPU cores"
          value={v.cpu}
          min={VPS_LIMITS.cpu.min}
          max={VPS_LIMITS.cpu.max}
          onChange={(cpu) => set({ cpu })}
          display={`${v.cpu} vCPU`}
          price={`${usd(VPS_PRICING.perCpu)}/core`}
          minLabel={`${VPS_LIMITS.cpu.min}`}
          maxLabel={`${VPS_LIMITS.cpu.max}`}
        />
        <RangeField
          label="RAM"
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

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="contents"><SubHeading hint="Setup is free on all servers">Data center location</SubHeading></legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LOCATIONS.map((l) => (
            <RadioCard key={l.id} name="dc" value={l.id} checked={d.locationId === l.id} onChange={() => {
              // If the chosen server isn't stocked here, switch to the first one that is.
              const server = DEDICATED_SERVERS.find((s) => s.id === d.serverId)!;
              const serverId = server.outOfStock.includes(l.id) ? DEDICATED_SERVERS.find((s) => !s.outOfStock.includes(l.id))!.id : d.serverId;
              set({ locationId: l.id, serverId });
            }} className="p-3">
              <span className="block font-semibold text-gray-950">{l.city}</span>
              <span className="block text-xs text-gray-600">{l.country}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading hint={`Availability in ${loc.city}`}>Server hardware</SubHeading></legend>
        <div className="space-y-2">
          {DEDICATED_SERVERS.map((s) => {
            const out = s.outOfStock.includes(d.locationId);
            return (
              <RadioCard key={s.id} name="server" value={s.id} checked={d.serverId === s.id} disabled={out} onChange={() => set({ serverId: s.id })} label={s.name}>
                <span className="flex flex-col gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-gray-950">
                      {s.name} {out && <Badge tone="danger">Out of stock in {loc.city}</Badge>}
                    </span>
                    <span className="mt-1 grid gap-x-6 gap-y-0.5 text-sm text-gray-700 sm:grid-cols-3">
                      <span><span className="text-gray-500">CPU </span>{s.cpu}</span>
                      <span><span className="text-gray-500">RAM </span>{s.ram}</span>
                      <span><span className="text-gray-500">Disk </span>{s.storage}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-bold text-gray-950">{usd(s.monthly)}<span className="text-sm font-normal text-gray-600">/mo</span></span>
                </span>
              </RadioCard>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading>Bandwidth</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {BANDWIDTH_PACKAGES.map((b) => (
            <RadioCard key={b.id} name="bw" value={b.id} checked={d.bandwidthId === b.id} onChange={() => set({ bandwidthId: b.id })} className="p-3">
              <span className="block font-semibold text-gray-950">{b.name}</span>
              <span className="block text-sm text-gray-700">{b.monthly ? `+${usd(b.monthly)}/mo` : 'Included'}</span>
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
        <legend className="contents"><SubHeading hint="Price per instance">Instance size</SubHeading></legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {CLOUD_SIZES.map((s) => (
            <RadioCard key={s.id} name="size" value={s.id} checked={c.sizeId === s.id} onChange={() => set({ sizeId: s.id })} className="p-3">
              <span className="block font-semibold text-gray-950">{s.name}</span>
              <span className="block text-sm text-gray-700">{s.cpu} vCPU · {s.ram} GB</span>
              <span className="block text-xs text-gray-600">{s.storage} GB NVMe</span>
              <span className="mt-1 block font-semibold text-gray-950">{usd(s.monthly)}<span className="text-xs font-normal text-gray-600">/mo</span></span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="contents"><SubHeading>Autoscaling</SubHeading></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCALING_PRESETS.map((s) => (
            <RadioCard key={s.id} name="scaling" value={s.id} checked={c.scalingId === s.id} onChange={() => set({ scalingId: s.id })} className="p-3">
              <span className="block font-semibold text-gray-950">{s.name}</span>
              <span className="block text-sm text-gray-700">{s.min === s.max ? `${s.min} instance` : `${s.min}–${s.max} instances`}</span>
              <span className="mt-1 block text-xs text-gray-600">{s.description}</span>
            </RadioCard>
          ))}
        </div>
        <Notice className="mt-3">
          Your plan price covers <strong>{scaling.min} {scaling.min === 1 ? 'instance' : 'instances'}</strong>.
          {scaling.max > scaling.min
            ? <> Extra instances (up to {scaling.max}) cost <strong>{fmt(cloudBurstHourly(cart), true)}/hour each</strong>, only while running, billed monthly in arrears.</>
            : <> It never scales, so there are no usage charges.</>}
        </Notice>
      </fieldset>

      <div className="space-y-2">
        <SubHeading>Kubernetes</SubHeading>
        <Switch
          checked={c.kubernetes}
          onChange={(kubernetes) => set({ kubernetes })}
          label="Managed Kubernetes"
          description="We run the control plane, upgrades and monitoring. Your instances become worker nodes."
          price={`+${usd(K8S_PRICING.controlPlane)}/mo`}
        />
        {c.kubernetes && (
          <div className="space-y-2 border-l-2 border-brand-200 pl-3 sm:pl-4">
            <Switch checked={c.k8sLoadBalancer} onChange={(k8sLoadBalancer) => set({ k8sLoadBalancer })} label="Load balancer" description="1 public IP with TLS termination" price={`+${usd(K8S_PRICING.loadBalancer)}/mo`} />
            <Switch checked={c.k8sRegistry} onChange={(k8sRegistry) => set({ k8sRegistry })} label="Container registry" description="50 GB of private image storage" price={`+${usd(K8S_PRICING.registry)}/mo`} />
          </div>
        )}
      </div>
    </div>
  );
}
