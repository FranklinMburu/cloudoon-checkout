// VPS: management level, operating system and resource sliders.

import type { CartState } from '../../../api/types';
import { toNumber } from '../../../lib/format';
import { useStore } from '../../../state/store';
import { useMoney } from '../../../state/useMoney';
import { FeatureList, Notice, RadioCard, RangeField, Segmented, SubHeading } from '../../../components/ui';

export function VpsConfigurator() {
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
