import { useState, type FormEvent, type ReactNode } from 'react';
import { COUNTRIES } from '../../data/catalog';
import { money } from '../../lib/format';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import type { Quote } from '../../types';
import { Card, Lock, Phone } from '../../components/icons';
import { Button, Notice, RadioCard, Section, TextButton, TextField } from '../../components/ui';

type Method = 'card' | 'mpesa' | 'paypal';

export interface PlacedOrder {
  number: string;
  email: string;
  method: string;
  quote: Quote;
  currency: string;
}

const DECLINE_CARD = '4000000000000002';

function addMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Step 3 — how to pay, plus a final, explicit review of every charge. */
export function PaymentStep({ onPlaced }: { onPlaced: (o: PlacedOrder) => void }) {
  const { cart, quote, checkout, setStep } = useStore();
  const cur = cart.currency;
  const [method, setMethod] = useState<Method>(cur === 'KES' || cart.country === 'KE' ? 'mpesa' : 'card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: checkout.billing.fullName });
  const [mpesa, setMpesa] = useState(checkout.billing.phone);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [declined, setDeclined] = useState('');

  const errors: Record<string, string> =
    method === 'card'
      ? { number: v.cardNumber(card.number), expiry: v.expiry(card.expiry), cvc: v.cvc(card.cvc), name: v.required('name as it appears on the card')(card.name) }
      : method === 'mpesa'
        ? { mpesa: v.mpesaPhone(mpesa) }
        : {};
  const show = (k: string) => (touched[k] || submitted ? errors[k] : '') || '';
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const brand = v.cardBrand(card.number);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setDeclined('');
    if (Object.values(errors).some(Boolean) || !agree) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      if (method === 'card' && card.number.replace(/\D/g, '') === DECLINE_CARD) {
        setProcessing(false);
        setDeclined('Your bank declined this card. No money was taken. Try another card or pay with M-Pesa or PayPal.');
        return;
      }
      onPlaced({
        number: `CL-${Math.floor(100000 + Math.random() * 900000)}`,
        email: checkout.account?.email ?? checkout.billing.email,
        method: method === 'card' ? `${brand ?? 'Card'} ending ${card.number.replace(/\D/g, '').slice(-4)}` : method === 'mpesa' ? `M-Pesa ${mpesa}` : 'PayPal',
        quote,
        currency: cur,
      });
    }, method === 'mpesa' ? 2200 : 1600);
  };

  const b = checkout.billing;
  const country = COUNTRIES.find((c) => c.code === b.country)?.name;

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
              <Notice>You’ll get a prompt on this phone to approve {money(quote.total, cur)}{cur !== 'KES' && ' (charged in KES at today’s rate)'}.</Notice>
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
                    {l.termLabel !== '—' ? `${l.termLabel}` : 'No charge'}
                    {l.renewal && (l.autoRenew === false
                      ? <> · Expires {addMonths(months)}</>
                      : <> · Then {money(l.renewal.amount, cur)} on {addMonths(months)}</>)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-950 tabular-nums">{l.dueToday === 0 ? 'Free' : money(l.dueToday, cur)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="tabular-nums">{money(quote.subtotal, cur)}</dd></div>
          {quote.promo && <div className="flex justify-between"><dt className="text-gray-600">Promo ({quote.promo.code})</dt><dd className="text-green-700 tabular-nums">−{money(quote.promo.amount, cur)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gray-600">Tax · {quote.taxLabel}</dt><dd className="tabular-nums">{money(quote.tax, cur)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-950"><dt>Due today</dt><dd className="tabular-nums">{money(quote.total, cur)}</dd></div>
        </dl>

        <dl className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-3 text-[13px] sm:grid-cols-2">
          <ReviewItem label="Account" onEdit={() => setStep(2)}>{checkout.account?.email ?? b.email}</ReviewItem>
          <ReviewItem label="Billing address" onEdit={() => setStep(2)}>
            {b.fullName}{b.isBusiness && b.company ? `, ${b.company}` : ''}, {b.address}, {b.city} {b.postalCode}, {country}
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

          {declined && <Notice tone="error">{declined}</Notice>}

          <Button type="submit" variant="accent" size="lg" fullWidth loading={processing}>
            {processing
              ? method === 'mpesa' ? 'Waiting for M-Pesa approval…' : 'Processing…'
              : <><Lock size={16} /> {method === 'paypal' ? 'Continue to PayPal' : `Pay ${money(quote.total, cur)}`}</>}
          </Button>
          <p className="text-center text-xs text-gray-500">Encrypted payment. We never store your full card number.</p>
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
