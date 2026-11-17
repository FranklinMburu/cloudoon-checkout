import { ADDON_PRICING, EMAIL_LIMITS, SSL_OPTIONS } from '../../data/catalog';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import type { AddonState } from '../../types';
import { Database, Lock, Mail, Shield, Zap } from '../../components/icons';
import { Quantity, RadioCard, Section, Switch } from '../../components/ui';

export function AddonsSection() {
  const { cart, update } = useStore();
  const { usd } = useMoney();
  const a = cart.addons;
  const set = (patch: Partial<AddonState>) => update({ addons: { ...a, ...patch } });
  const term = cart.cycle === 1 ? 'monthly' : `for ${cart.cycle} months`;

  return (
    <Section id="addons" title="Add-ons" description={`Optional extras, billed ${term} with your plan. Add-on prices don’t change at renewal.`}>
      <div className="space-y-2">
        <Switch
          icon={<Database size={20} />}
          checked={a.backups}
          onChange={(backups) => set({ backups })}
          label="Automated daily backups"
          description="Restore your site or server to any of the last 30 days in one click."
          price={`+${usd(ADDON_PRICING.backups)}/mo`}
        />
        <Switch
          icon={<Zap size={20} />}
          checked={a.cdn}
          onChange={(cdn) => set({ cdn })}
          label="CDN"
          description="Serve images and pages from edge locations close to your visitors."
          price={`+${usd(ADDON_PRICING.cdn)}/mo`}
        />
        <Switch
          icon={<Shield size={20} />}
          checked={a.ddosAdvanced}
          onChange={(ddosAdvanced) => set({ ddosAdvanced })}
          label="Advanced DDoS protection"
          description="Standard protection is always included. Advanced adds application-layer filtering up to 1 Tbps."
          price={`+${usd(ADDON_PRICING.ddosAdvanced)}/mo`}
        />

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3 sm:p-4">
          <span className="hidden rounded-lg bg-gray-100 p-2 text-gray-600 sm:block"><Mail size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-950">Professional email</p>
            <p className="text-sm text-gray-600">you@yourdomain · 50 GB per mailbox · {usd(ADDON_PRICING.emailPerBox)}/mailbox/mo</p>
          </div>
          <div className="flex items-center gap-3">
            <Quantity label="Mailboxes" value={a.emailBoxes} min={EMAIL_LIMITS.min} max={EMAIL_LIMITS.max} onChange={(emailBoxes) => set({ emailBoxes })} />
          </div>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-3 flex items-center gap-2 font-semibold text-gray-950"><Lock size={18} /> SSL certificate</legend>
        <div className="grid gap-2 md:grid-cols-3">
          {SSL_OPTIONS.map((s) => (
            <RadioCard key={s.id} name="ssl" value={s.id} checked={a.ssl === s.id} onChange={() => set({ ssl: s.id })} className="p-3">
              <span className="block pr-6 font-semibold text-gray-950">{s.name}</span>
              <span className="block text-sm text-gray-600">{s.description}</span>
              <span className="mt-1 block text-sm font-semibold text-gray-950">{s.monthly ? `+${usd(s.monthly)}/mo` : 'Included'}</span>
            </RadioCard>
          ))}
        </div>
      </fieldset>
    </Section>
  );
}
