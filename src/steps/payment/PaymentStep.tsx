import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api } from '../../api/client';
import { tokenizeCard } from '../../api/paymentProvider';
import type { PaymentInput } from '../../api/types';
import { toNumber } from '../../lib/format';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Card, Lock, Phone } from '../../components/icons';
import { Button, Notice, RadioCard, Section, TextButton, TextField } from '../../components/ui';

type Method = PaymentInput['method'];

function addMonths(months: number) {
  const d = new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); // 31 Jan + 1 mo → 28/29 Feb
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Step 3 — how to pay, plus a final, explicit review of every charge. */
export function PaymentStep() {
  const { cart, catalog, quote, quoting, checkout, setStep, completeOrder } = useStore();
  const { fmt, fmtPrecise, currency } = useMoney();
  const [method, setMethod] = useState<Method>(currency === 'KES' || cart.country === 'KE' ? 'mpesa' : 'card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: checkout.billing.full_name });
  const [mpesa, setMpesa] = useState(checkout.billing.phone);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [failure, setFailure] = useState('');
  // One key per checkout attempt: retries, double clicks and refreshes can never create a second order.
  const idempotencyKey = useRef(crypto.randomUUID());

  const errors: Record<string, string> =
    method === 'card'
      ? { number: v.cardNumber(card.number), expiry: v.expiry(card.expiry), cvc: v.cvc(card.cvc), name: v.required('name as it appears on the card')(card.name) }
      : method === 'mpesa'
        ? { mpesa: v.mpesaPhone(mpesa) }
        : {};
  const show = (k: string) => (touched[k] || submitted ? errors[k] : '') || '';
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const brand = v.cardBrand(card.number);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure('');
    if (Object.values(errors).some(Boolean) || !agree) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const payment: PaymentInput =
      method === 'card' ? { method, ...tokenizeCard(card.number) } : method === 'mpesa' ? { method, phone: mpesa } : { method };
    const { is_business, ...billing } = checkout.billing;
    setProcessing(true);
    try {
      const order = await api.createOrder(
        { cart, billing: { ...billing, company: is_business ? billing.company : '', tax_id: is_business ? billing.tax_id : '' }, payment, accept_terms: agree },
        idempotencyKey.current,
      );
      completeOrder(order);
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'Payment failed. No money was taken. Please try again.');
      setProcessing(false);
    }
  };

  const b = checkout.billing;
  const country = catalog.countries.find((c) => c.code === b.country)?.name;
  if (!quote) return null;
  const hasCloudBurst = cart.category === 'cloud' && quote.cloud_burst_hourly;

  return (
    <form onSubmit={submit} noValidate className="space-y-3 sm:space-y-4">
      <Section title="Payment method" description="Charged once today. Renewals use the same method.">
        <fieldset>
          <legend className="sr-only">Payment method</legend>
          <div className="grid grid-cols-3 gap-2">
            <MethodCard value="card" current={method} onChange={setMethod} icon={<Card size={18} />} title="Card" note="Visa, Mastercard, Amex" />
            <MethodCard value="mpesa" current={method} onChange={setMethod} icon={<Phone size={18} />} title="M-Pesa" note="Approve on your phone" />
            <MethodCard value="paypal" current={method} onChange={setMethod} icon={<span className="text-[13px] font-semibold italic">P</span>} title="PayPal" note="Pay with PayPal" />
          </div>
        </fieldset>

        <div className="mt-4">
          {method === 'card' && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <TextField
                className="col-span-2"
                label="Card number"
                inputMode="numeric"
                autoComplete="cc-number"
                value={card.number}
                onChange={(n) => setCard({ ...card, number: v.formatCardNumber(n) })}
                onBlur={touch('number')}
                error={show('number')}
                placeholder="1234 5678 9012 3456"
                trailing={brand ? <span className="pr-3 text-xs font-medium text-gray-600">{brand}</span> : undefined}
                hint="Test: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined"
              />
              <TextField label="Expiry" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(x) => setCard({ ...card, expiry: v.formatExpiry(x) })} onBlur={touch('expiry')} error={show('expiry')} placeholder="MM / YY" />
              <TextField label="CVC" inputMode="numeric" autoComplete="cc-csc" value={card.cvc} onChange={(x) => setCard({ ...card, cvc: x.replace(/\D/g, '').slice(0, 4) })} onBlur={touch('cvc')} error={show('cvc')} placeholder="123" />
              <TextField className="col-span-2" label="Name on card" autoComplete="cc-name" value={card.name} onChange={(name) => setCard({ ...card, name })} onBlur={touch('name')} error={show('name')} />
            </div>
          )}
          {method === 'mpesa' && (
            <div className="space-y-3">
              <TextField label="M-Pesa phone number" type="tel" inputMode="tel" autoComplete="tel" value={mpesa} onChange={setMpesa} onBlur={touch('mpesa')} error={show('mpesa')} placeholder="0712 345 678" />
              <Notice>You’ll get a prompt on this phone to approve {fmt(quote.total)}{currency !== 'KES' && ' (charged in KES at today’s rate)'}.</Notice>
            </div>
          )}
          {method === 'paypal' && <Notice>PayPal opens in a pop-up when you continue, then brings you back here.</Notice>}
        </div>
      </Section>

      <Section title="Review" description="What you pay today, and what renews later.">
        <ul className="divide-y divide-gray-100 border-y border-gray-100">
          {quote.lines.map((l) => {
            const months = l.kind === 'domain' ? 12 : cart.cycle;
            return (
              <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words text-gray-950">{l.title}</p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {l.term_label !== '—' ? l.term_label : 'No charge'}
                    {l.renewal && (l.auto_renew === false
                      ? <> · Expires {addMonths(months)}</>
                      : <> · Then {fmt(l.renewal.amount)} on {addMonths(months)}</>)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-950 tabular-nums">{toNumber(l.due_today) === 0 ? 'Free' : fmt(l.due_today)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="tabular-nums">{fmt(quote.subtotal)}</dd></div>
          {quote.promo && <div className="flex justify-between"><dt className="text-gray-600">Promo ({quote.promo.code}), first term only</dt><dd className="text-green-700 tabular-nums">−{fmt(quote.promo.amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gray-600">Tax · {quote.tax_label}</dt><dd className="tabular-nums">{fmt(quote.tax)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-950"><dt>Due today</dt><dd className="tabular-nums">{fmt(quote.total)}</dd></div>
        </dl>
        {(quote.promo || hasCloudBurst) && (
          <ul className="mt-3 space-y-1 text-xs text-gray-600">
            {quote.promo && <li>Renewal prices above don’t include the promo discount.</li>}
            {hasCloudBurst && <li>Autoscaling: extra instances cost {fmtPrecise(quote.cloud_burst_hourly!)}/hour each while running, billed monthly.</li>}
          </ul>
        )}

        <dl className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-3 text-[13px] sm:grid-cols-2">
          <ReviewItem label="Account" onEdit={() => setStep(2)}>{checkout.account?.email ?? b.email}</ReviewItem>
          <ReviewItem label="Billing address" onEdit={() => setStep(2)}>
            {b.full_name}{b.is_business && b.company ? `, ${b.company}` : ''}, {b.address}, {b.city} {b.postal_code}, {country}
          </ReviewItem>
        </dl>

        <div className="mt-4 space-y-3">
          <label className={`-mx-2 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${submitted && !agree ? 'bg-red-50' : ''}`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={submitted && !agree ? true : undefined}
              aria-describedby={submitted && !agree ? 'agree-error' : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
            />
            <span className="text-[13px] text-gray-700">
              I agree to the <a href="#terms" onClick={(e) => e.preventDefault()} className="font-medium text-brand-700 underline underline-offset-2">Terms of Service</a>. My services renew automatically at the prices above until I turn auto-renew off.
            </span>
          </label>
          {submitted && !agree && <p id="agree-error" role="alert" className="-mt-2 text-[13px] text-red-700">Please accept the terms to continue.</p>}

          {failure && <Notice tone="error">{failure}</Notice>}

          <Button type="submit" variant="accent" size="lg" fullWidth loading={processing} disabled={quoting}>
            {processing
              ? method === 'mpesa' ? 'Waiting for M-Pesa approval…' : 'Processing…'
              : <><Lock size={16} /> {method === 'paypal' ? 'Continue to PayPal' : `Pay ${fmt(quote.total)}`}</>}
          </Button>
          <p className="text-center text-xs text-gray-500">Encrypted payment. Your card number goes to the payment provider, never to our servers.</p>
        </div>
      </Section>
    </form>
  );
}

function MethodCard({ value, current, onChange, icon, title, note }: { value: Method; current: Method; onChange: (m: Method) => void; icon: ReactNode; title: string; note: string }) {
  const on = current === value;
  return (
    <RadioCard name="payment-method" value={value} checked={on} onChange={() => onChange(value)} indicator={false} className="justify-center sm:justify-start" label={title}>
      <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2.5">
        <span className={on ? 'text-brand-600' : 'text-gray-500'}>{icon}</span>
        <span className="text-center sm:text-left">
          <span className="block text-sm font-medium text-gray-950">{title}</span>
          <span className="hidden text-xs text-gray-500 sm:block">{note}</span>
        </span>
      </span>
    </RadioCard>
  );
}

function ReviewItem({ label, children, onEdit }: { label: string; children: ReactNode; onEdit: () => void }) {
  return (
    <div>
      <dt className="flex items-center justify-between font-medium text-gray-950">
        {label}
        <TextButton onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>Edit</TextButton>
      </dt>
      <dd className="break-words text-gray-600">{children}</dd>
    </div>
  );
}
