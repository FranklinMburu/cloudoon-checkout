import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Order } from '../api/types';
import { money } from '../lib/format';
import { useStore } from '../state/store';
import { Check, Globe, Mail, Receipt, Server } from '../components/icons';
import { Button, Notice } from '../components/ui';

/** Receipt for the order the API just created. It survives a refresh; the cart was already emptied. */
export function Confirmation({ order, onNewOrder }: { order: Order; onNewOrder: () => void }) {
  const { catalog } = useStore();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [dashboardNote, setDashboardNote] = useState(false);
  const decimals = order.currency === catalog.currency.code ? catalog.currency.decimals : order.currency === 'KES' ? 0 : 2;
  const fmt = (amount: string) => money(amount, order.currency, decimals);
  const hosting = order.items.find((i) => i.kind === 'hosting');
  const domains = order.items.filter((i) => i.kind === 'domain');

  useEffect(() => headingRef.current?.focus(), []);

  const next = [
    { icon: <Mail size={18} />, title: 'Receipt sent', text: `A receipt and your login details are on their way to ${order.email}.` },
    hosting && {
      icon: <Server size={18} />,
      title: `${hosting.title} is being set up`,
      text: hosting.title.startsWith('Dedicated') ? 'Dedicated servers are ready within 4 hours. We’ll email you the access details.' : 'Usually ready in under 5 minutes. We’ll email you when it’s live.',
    },
    domains.length > 0 && {
      icon: <Globe size={18} />,
      title: domains.length === 1 ? `Domain: ${domains[0].title}` : `${domains.length} domains`,
      text: 'New registrations go live within minutes. Transfers take 5–7 days.',
    },
  ].filter(Boolean) as { icon: ReactNode; title: string; text: string }[];

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-14">
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
        <div className="pop mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
          <Check size={24} strokeWidth={3} />
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-semibold tracking-tight text-gray-950 outline-none sm:text-2xl">Payment successful</h1>
        <p className="mt-1.5 text-sm text-gray-600 tabular-nums">
          Order <span className="font-medium text-gray-950">{order.number}</span> · {fmt(order.total)} paid with {order.payment_label}
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
          {order.items.map((i) => (
            <li key={i.line_id} className="flex justify-between gap-3 py-2">
              <span className="text-gray-800">{i.title} <span className="text-gray-500">· {i.term_label === '—' ? 'no charge' : i.term_label}</span></span>
              <span className="font-medium whitespace-nowrap text-gray-950">{Number(i.due_today) === 0 ? 'Free' : fmt(i.due_today)}</span>
            </li>
          ))}
          {order.promo_code && <li className="flex justify-between py-2 text-green-700"><span>Promo {order.promo_code}</span><span>−{fmt(order.discount)}</span></li>}
          <li className="flex justify-between py-2 text-gray-700"><span>Tax ({order.tax_label})</span><span>{fmt(order.tax)}</span></li>
          <li className="flex justify-between py-2 text-sm font-semibold text-gray-950"><span>Total paid</span><span>{fmt(order.total)}</span></li>
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
