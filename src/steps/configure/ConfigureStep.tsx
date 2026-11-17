import { useState } from 'react';
import { useStore } from '../../state/store';
import { Badge, CollapsibleSection } from '../../components/ui';
import { AddonsPanel, useAddonsSummary } from './AddonsPanel';
import { BillingCycleSection } from './BillingCycleSection';
import { DomainPanel, useDomainSummary } from './DomainPanel';
import { HostingSection } from './hosting/HostingSection';

/**
 * Step 1 — what is being bought. Hosting and billing period are always open (every order needs them);
 * Domain and Add-ons are optional, so they stay one-line summaries until opened.
 */
export function ConfigureStep() {
  const { cart, quote } = useStore();
  const [open, setOpen] = useState({ domain: cart.domains.length > 0, addons: false });
  const domainSummary = useDomainSummary();
  const addonsSummary = useAddonsSummary();

  return (
    <div className="space-y-3 sm:space-y-4">
      <HostingSection />
      <BillingCycleSection />
      <CollapsibleSection
        id="domain"
        title="Domain"
        summary={domainSummary}
        open={open.domain}
        onToggle={() => setOpen((o) => ({ ...o, domain: !o.domain }))}
        badge={quote?.free_domain.eligible && !quote.free_domain.applied_to ? <Badge tone="success">Free 1st year</Badge> : undefined}
      >
        <DomainPanel />
      </CollapsibleSection>
      {cart.category !== 'none' && (
        <CollapsibleSection id="addons" title="Add-ons" summary={addonsSummary} open={open.addons} onToggle={() => setOpen((o) => ({ ...o, addons: !o.addons }))}>
          <AddonsPanel />
        </CollapsibleSection>
      )}
    </div>
  );
}
