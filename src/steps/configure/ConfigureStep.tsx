import { AddonsSection } from './AddonsSection';
import { BillingCycleSection } from './BillingCycleSection';
import { DomainSection } from './DomainSection';
import { HostingSection } from './HostingSection';

/** Step 1 — everything about *what* is being bought, top to bottom. */
export function ConfigureStep() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <HostingSection />
      <BillingCycleSection />
      <DomainSection />
      <AddonsSection />
    </div>
  );
}
