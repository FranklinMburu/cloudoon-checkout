import { useState, type FormEvent, type ReactNode } from 'react';
import { COUNTRIES } from '../../data/catalog';
import { money } from '../../lib/format';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import type { Quote } from '../../types';
import { Card, Lock, Phone } from '../../components/icons';
import { Button, Notice, RadioCard, Section, TextField } from '../../components/ui';

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
    <form onSubmit={submit} noValidate className="space-y-4 sm:space-y-6">
      <Section title="Payment method" description="You’ll be charged once, today. Renewals use the same method.">
        <fieldset>
          <legend className="sr-only">Payment method</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <MethodCard value="card" current={method} onChange={setMethod} icon={<Card size={20} />} title="Card" note="Visa, Mastercard, Amex" />
            <MethodCard value="mpesa" current={method} onChange={setMethod} icon={<Phone size={20} />} title="M-Pesa" note="Pay from your phone" />
            <MethodCard value="paypal" current={method} onChange={setMethod} icon={<span className="text-sm font-bold italic">P</span>} title="PayPal" note="Log in to PayPal" />
          </div>
        </fieldset>

        <div className="mt-5">
          {method === 'card' && (
            <div className="grid gap-4 sm:grid-cols-6">
              <TextField
                className="sm:col-span-6"
                label="Card number"
                inputMode="numeric"
                autoComplete="cc-number"
                value={card.number}
                onChange={(n) => setCard({ ...card, number: v.formatCardNumber(n) })}
                onBlur={touch('number')}
                error={show('number')}
                placeholder="1234 5678 9012 3456"
                trailing={brand ? <span className="pr-3 text-xs font-semibold text-gray-700">{brand}</span> : undefined}
                hint="Test: 4242 4242 4242 4242 succeeds · 4000 0000 0000 0002 is declined"
              />
              <TextField className="sm:col-span-3" label="Expiry date" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(x) => setCard({ ...card, expiry: v.formatExpiry(x) })} onBlur={touch('expiry')} error={show('expiry')} placeholder="MM / YY" />
              <TextField className="sm:col-span-3" label="Security code (CVC)" inputMode="numeric" autoComplete="cc-csc" value={card.cvc} onChange={(x) => setCard({ ...card, cvc: x.replace(/\D/g, '').slice(0, 4) })} onBlur={touch('cvc')} error={show('cvc')} placeholder="3 or 4 digits" hint="On the back of your card" />
              <TextField className="sm:col-span-6" label="Name on card" autoComplete="cc-name" value={card.name} onChange={(name) => setCard({ ...card, name })} onBlur={touch('name')} error={show('name')} />
            </div>
          )}
          {method === 'mpesa' && (
            <div className="space-y-3">
              <TextField label="M-Pesa phone number" type="tel" inputMode="tel" autoComplete="tel" value={mpesa} onChange={setMpesa} onBlur={touch('mpesa')} error={show('mpesa')} placeholder="0712 345 678" />
              <Notice>We’ll send a payment request to this phone. Enter your M-Pesa PIN to approve {money(quote.total, cur)}{cur !== 'KES' && ' (charged in KES at today’s rate)'}.</Notice>
            </div>
          )}
          {method === 'paypal' && <Notice>A PayPal window opens when you place the order. You’ll come straight back here afterwards.</Notice>}
        </div>
      </Section>

      <Section title="Review your order" description="Exactly what you pay today and what renews later.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Charges today and at renewal</caption>
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th scope="col" className="py-2 pr-3 font-medium">Item</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Today</th>
                <th scope="col" className="py-2 text-right font-medium">Then</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quote.lines.map((l) => {
                const months = l.kind === 'domain' ? 12 : cart.cycle;
                return (
                  <tr key={l.id} className="align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-950">{l.title}</p>
                      <p className="text-xs text-gray-600">{l.termLabel !== '—' ? `${l.termLabel} term` : l.details[0]}</p>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold whitespace-nowrap text-gray-950">{l.dueToday === 0 ? 'Free' : money(l.dueToday, cur)}</td>
                    <td className="py-3 text-right text-xs whitespace-nowrap text-gray-700">
                      {!l.renewal ? '—' : l.autoRenew === false ? <>Expires {addMonths(months)}<br />(auto-renew off)</> : <>{money(l.renewal.amount, cur)} on {addMonths(months)}<br />then {l.renewal.label}</>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-gray-200">
              <tr><td className="pt-3 text-gray-700">Subtotal</td><td className="pt-3 pr-3 text-right">{money(quote.subtotal, cur)}</td><td /></tr>
              {quote.promo && <tr><td className="text-green-700">Promo {quote.promo.code}</td><td className="pr-3 text-right text-green-700">−{money(quote.promo.amount, cur)}</td><td /></tr>}
              <tr><td className="text-gray-700">Tax ({quote.taxLabel})</td><td className="pr-3 text-right">{money(quote.tax, cur)}</td><td /></tr>
              <tr className="text-base font-bold text-gray-950"><td className="pt-2">Total today</td><td className="pt-2 pr-3 text-right whitespace-nowrap">{money(quote.total, cur)}</td><td /></tr>
            </tfoot>
          </table>
        </div>

        <dl className="mt-5 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
          <ReviewItem label="Account" onEdit={() => setStep(2)}>{checkout.account?.email ?? b.email}</ReviewItem>
          <ReviewItem label="Billing address" onEdit={() => setStep(2)}>
            {b.fullName}{b.isBusiness && b.company ? `, ${b.company}` : ''}<br />{b.address}, {b.city} {b.postalCode}, {country}
          </ReviewItem>
        </dl>

        <div className="mt-5 space-y-4">
          <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${submitted && !agree ? 'bg-red-50 ring-1 ring-red-200' : ''}`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={submitted && !agree ? true : undefined}
              aria-describedby={submitted && !agree ? 'agree-error' : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
            />
            <span className="text-sm text-gray-800">
              I agree to the <a href="#terms" onClick={(e) => e.preventDefault()} className="font-semibold text-brand-700 underline">Terms of Service</a> and understand my services renew automatically at the prices above until I turn auto-renew off.
            </span>
          </label>
          {submitted && !agree && <p id="agree-error" role="alert" className="-mt-2 pl-2 text-sm text-red-700">Tick the box to confirm you agree to the terms.</p>}

          {declined && <Notice tone="error">{declined}</Notice>}

          <Button type="submit" variant="accent" size="lg" fullWidth loading={processing}>
            {processing
              ? method === 'mpesa' ? 'Waiting for M-Pesa approval…' : 'Processing payment…'
              : <><Lock size={18} /> {method === 'paypal' ? 'Continue to PayPal' : `Pay ${money(quote.total, cur)} now`}</>}
          </Button>
          <p className="text-center text-xs text-gray-600">Payments are encrypted. We never store your full card number.</p>
        </div>
      </Section>
    </form>
  );
}

function MethodCard({ value, current, onChange, icon, title, note }: { value: Method; current: Method; onChange: (m: Method) => void; icon: ReactNode; title: string; note: string }) {
  return (
    <RadioCard name="payment-method" value={value} checked={current === value} onChange={() => onChange(value)} className="p-3">
      <span className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${current === value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{icon}</span>
        <span>
          <span className="block font-semibold text-gray-950">{title}</span>
          <span className="block text-xs text-gray-600">{note}</span>
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
        <button type="button" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`} className="-my-3 min-h-11 rounded-md px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none">Edit</button>
      </dt>
      <dd className="mt-1 break-words text-gray-700">{children}</dd>
    </div>
  );
}
