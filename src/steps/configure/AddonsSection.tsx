import { ADDON_PRICING, EMAIL_LIMITS, SSL_OPTIONS } from '../../data/catalog';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import type { AddonState } from '../../types';
import { ListGroup, Quantity, RadioCard, Section, SubHeading, Switch } from '../../components/ui';

export function AddonsSection() {
  const { cart, update } = useStore();
  const { usd } = useMoney();
  const a = cart.addons;
  const set = (patch: Partial<AddonState>) => update({ addons: { ...a, ...patch } });

  return (
    <Section id="addons" title="Add-ons" description="Optional. Billed with your plan; prices don’t change at renewal.">
      <ListGroup>
        <Switch checked={a.backups} onChange={(backups) => set({ backups })} label="Daily backups" description="30 days of one-click restore points" price={`+${usd(ADDON_PRICING.backups)}/mo`} />
        <Switch checked={a.cdn} onChange={(cdn) => set({ cdn })} label="CDN" description="Faster pages from edge locations near visitors" price={`+${usd(ADDON_PRICING.cdn)}/mo`} />
        <Switch checked={a.ddosAdvanced} onChange={(ddosAdvanced) => set({ ddosAdvanced })} label="Advanced DDoS protection" description="Adds layer-7 filtering. Standard protection is included." price={`+${usd(ADDON_PRICING.ddosAdvanced)}/mo`} />
        <div className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-950">Professional email</p>
            <p className="mt-0.5 text-[13px] text-gray-600">{usd(ADDON_PRICING.emailPerBox)}/mailbox/mo · 50 GB each</p>
          </div>
          <Quantity label="Mailboxes" value={a.emailBoxes} min={EMAIL_LIMITS.min} max={EMAIL_LIMITS.max} onChange={(emailBoxes) => set({ emailBoxes })} />
        </div>
      </ListGroup>

      <fieldset className="mt-5">
        <legend className="contents"><SubHeading>SSL certificate</SubHeading></legend>
        <div className="grid gap-2 md:grid-cols-3">
          {SSL_OPTIONS.map((s) => (
            <RadioCard key={s.id} name="ssl" value={s.id} checked={a.ssl === s.id} onChange={() => set({ ssl: s.id })}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-950">{s.name}</span>
                <span className="shrink-0 text-[13px] text-gray-600 tabular-nums">{s.monthly ? `+${usd(s.monthly)}/mo` : 'Included'}</span>
              </span>
              <span className="mt-0.5 block text-[13px] text-gray-600">{s.description}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>
    </Section>
  );
}
