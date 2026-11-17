import type { CartState } from '../../api/types';
import { toNumber } from '../../lib/format';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { ListGroup, Quantity, RadioCard, SubHeading, Switch } from '../../components/ui';

/** Add-on options. Rendered inside a collapsible section on step 1 (progressive disclosure). */
export function AddonsPanel() {
  const { cart, catalog, update } = useStore();
  const { fmt } = useMoney();
  const a = cart.addons;
  const set = (patch: Partial<CartState['addons']>) => update({ addons: { ...a, ...patch } });
  const addon = (slug: string) => catalog.addons.find((x) => x.slug === slug)!;
  const row = (slug: string, key: 'backups' | 'cdn' | 'ddos_advanced') => {
    const x = addon(slug);
    return <Switch checked={a[key]} onChange={(on) => set({ [key]: on })} label={x.name} description={x.description} price={`+${fmt(x.monthly)}/mo`} />;
  };
  const email = addon('email-mailbox');

  return (
    <div>
      <p className="mb-3 text-[13px] text-gray-600">Billed with your plan. Add-on prices don’t change at renewal.</p>
      <ListGroup>
        {row('backups', 'backups')}
        {row('cdn', 'cdn')}
        {row('ddos-advanced', 'ddos_advanced')}
        <div className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-950">{email.name}</p>
            <p className="mt-0.5 text-[13px] text-gray-600">{fmt(email.monthly)}/mailbox/mo · {email.description}</p>
          </div>
          <Quantity label="Mailboxes" value={a.email_boxes} min={0} max={catalog.limits.max_mailboxes} onChange={(email_boxes) => set({ email_boxes })} />
        </div>
      </ListGroup>

      <fieldset className="mt-5">
        <legend className="contents"><SubHeading>SSL certificate</SubHeading></legend>
        <div className="space-y-2">
          {catalog.ssl_options.map((s) => (
            <RadioCard key={s.slug} name="ssl" value={s.slug} checked={a.ssl === s.slug} onChange={() => set({ ssl: s.slug })}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-gray-950">{s.name}</span>
                <span className="shrink-0 text-[13px] text-gray-600 tabular-nums">{toNumber(s.monthly) > 0 ? `+${fmt(s.monthly)}/mo` : 'Included'}</span>
              </span>
              <span className="mt-0.5 block text-[13px] text-gray-600">{s.description}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** One-line summary shown while the add-ons section is collapsed. */
export function useAddonsSummary() {
  const { cart, catalog } = useStore();
  const a = cart.addons;
  const names = [
    a.backups && 'Backups',
    a.cdn && 'CDN',
    a.ddos_advanced && 'Advanced DDoS',
    a.email_boxes > 0 && `${a.email_boxes} mailbox${a.email_boxes > 1 ? 'es' : ''}`,
    a.ssl !== 'free' && catalog.ssl_options.find((s) => s.slug === a.ssl)?.name,
  ].filter(Boolean) as string[];
  return names.length ? names.join(', ') : 'None selected · Standard SSL and DDoS protection included';
}
