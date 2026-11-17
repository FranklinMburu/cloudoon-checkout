// Dedicated servers: data center, hardware (with stock) and bandwidth.

import { useState } from 'react';
import type { CartState } from '../../../api/types';
import { toNumber } from '../../../lib/format';
import { useStore } from '../../../state/store';
import { useMoney } from '../../../state/useMoney';
import { Badge, Notice, RadioCard, SubHeading } from '../../../components/ui';

export function DedicatedConfigurator() {
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
