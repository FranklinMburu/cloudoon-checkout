import { useEffect, useRef, useState } from 'react';
import { money } from '../lib/format';
import type { CurrencyCode } from '../types';
import { Check, Mail, Receipt, Server, Globe } from '../components/icons';
import { Button, Notice } from '../components/ui';
import type { PlacedOrder } from './payment/PaymentStep';

export function Confirmation({ order, onNewOrder }: { order: PlacedOrder; onNewOrder: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cur = order.currency as CurrencyCode;
  const q = order.quote;
  const hosting = q.lines[0];
  const domains = q.lines.filter((l) => l.kind === 'domain');

  const [dashboardNote, setDashboardNote] = useState(false);
  useEffect(() => headingRef.current?.focus(), []);

  const next = [
    { icon: <Mail size={18} />, title: 'Receipt sent', text: `A receipt and your login details are on their way to ${order.email}.` },
    { icon: <Server size={18} />, title: `${hosting.title} is being set up`, text: hosting.title.startsWith('Dedicated') ? 'Dedicated servers are ready within 4 hours. We’ll email you the access details.' : 'Usually ready in under 5 minutes. We’ll email you when it’s live.' },
    ...(domains.length
      ? [{ icon: <Globe size={18} />, title: domains.length === 1 ? `Domain: ${domains[0].title}` : `${domains.length} domains`, text: 'New registrations go live within minutes. Transfers take 5–7 days.' }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-14">
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
        <div className="pop mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
          <Check size={24} strokeWidth={3} />
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-semibold tracking-tight text-gray-950 outline-none sm:text-2xl">Payment successful</h1>
        <p className="mt-1.5 text-sm text-gray-600 tabular-nums">
          Order <span className="font-medium text-gray-950">{order.number}</span> · {money(q.total, cur)} paid with {order.method}
        </p>
      </div>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-base font-semibold text-gray-950">What happens next</h2>
        <ol className="mt-3 space-y-3">
          {next.map((n) => (
            <li key={n.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">{n.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-950">{n.title}</p>
                <p className="text-[13px] text-gray-600">{n.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="receipt-heading">
        <h2 id="receipt-heading" className="flex items-center gap-2 text-base font-semibold text-gray-950"><Receipt size={18} /> Receipt</h2>
        <ul className="mt-2 divide-y divide-gray-100 text-[13px] tabular-nums">
          {q.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 py-2">
              <span className="text-gray-800">{l.title} <span className="text-gray-500">· {l.termLabel === '—' ? 'no charge' : l.termLabel}</span></span>
              <span className="font-medium whitespace-nowrap text-gray-950">{l.dueToday === 0 ? 'Free' : money(l.dueToday, cur)}</span>
            </li>
          ))}
          {q.promo && <li className="flex justify-between py-2 text-green-700"><span>Promo {q.promo.code}</span><span>−{money(q.promo.amount, cur)}</span></li>}
          <li className="flex justify-between py-2 text-gray-700"><span>Tax ({q.taxLabel})</span><span>{money(q.tax, cur)}</span></li>
          <li className="flex justify-between py-2 text-sm font-semibold text-gray-950"><span>Total paid</span><span>{money(q.total, cur)}</span></li>
        </ul>
      </section>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={() => setDashboardNote(true)}>Go to my dashboard</Button>
        <Button variant="secondary" onClick={onNewOrder}>Start a new order</Button>
      </div>
      {dashboardNote && <Notice className="mt-4">The customer dashboard is outside the scope of this checkout prototype.</Notice>}
    </div>
  );
}
