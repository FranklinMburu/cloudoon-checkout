import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { loadStripe, type Stripe, type StripeElement } from '../../lib/stripe';
import { FieldShell, Notice, Skeleton, TextField, inputClass } from '../../components/ui';

type Part = 'number' | 'expiry' | 'cvc';
const PARTS: { part: Part; type: 'cardNumber' | 'cardExpiry' | 'cardCvc'; label: string; empty: string }[] = [
  { part: 'number', type: 'cardNumber', label: 'Card number', empty: 'Enter your card number.' },
  { part: 'expiry', type: 'cardExpiry', label: 'Expiry', empty: 'Enter the expiry date.' },
  { part: 'cvc', type: 'cardCvc', label: 'CVC', empty: 'Enter the 3 or 4 digit security code.' },
];

export interface CardFieldsHandle {
  /** Shows any field errors; true when the card is ready to submit. */
  validate(): boolean;
  /** Sends the card to Stripe (never to our server) and returns the PaymentMethod for the order. */
  createPaymentMethod(billing: { name: string; email: string; phone: string }): Promise<{ id: string; brand: string; last4: string }>;
}

interface Props {
  publishableKey: string;
  cardholder: string;
  onCardholderChange: (name: string) => void;
  ref: Ref<CardFieldsHandle>;
}

/**
 * Card inputs from Stripe Elements, laid out and styled like the rest of the form.
 * Each input is an iframe served by Stripe, so card numbers never touch our page or API.
 */
export function CardFields({ publishableKey, cardholder, onCardholderChange, ref }: Props) {
  const stripe = useRef<Stripe | null>(null);
  const elements = useRef<Partial<Record<Part, StripeElement>>>({});
  const mounts = useRef<Partial<Record<Part, HTMLDivElement | null>>>({});
  const [state, setState] = useState<Record<Part, { complete: boolean; error: string; touched: boolean; focused: boolean }>>(() => ({
    number: { complete: false, error: '', touched: false, focused: false },
    expiry: { complete: false, error: '', touched: false, focused: false },
    cvc: { complete: false, error: '', touched: false, focused: false },
  }));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const created: StripeElement[] = [];
    const patch = (part: Part, p: Partial<(typeof state)[Part]>) => setState((s) => ({ ...s, [part]: { ...s[part], ...p } }));

    loadStripe(publishableKey)
      .then((instance) => {
        if (cancelled) return;
        stripe.current = instance;
        const group = instance.elements({ fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap' }] });
        const style = {
          base: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: window.innerWidth < 640 ? '16px' : '14px', color: '#030712', '::placeholder': { color: '#9ca3af' } },
          invalid: { color: '#030712' },
        };
        for (const { part, type } of PARTS) {
          const el = group.create(type, { style, ...(type === 'cardNumber' && { showIcon: true }) });
          el.on('change', (e) => patch(part, { complete: e.complete, error: e.error?.message ?? '' }));
          el.on('blur', () => patch(part, { touched: true, focused: false }));
          el.on('focus', () => patch(part, { focused: true }));
          el.mount(mounts.current[part]!);
          elements.current[part] = el;
          created.push(el);
        }
        created[0].on('ready', () => !cancelled && setReady(true));
      })
      .catch(() => !cancelled && setLoadError('Card payments couldn’t load. Check your connection, or choose another way to pay.'));

    return () => {
      cancelled = true;
      created.forEach((el) => el.destroy());
      elements.current = {};
    };
  }, [publishableKey]);

  const errorFor = (part: Part) => {
    const s = state[part];
    if (!(s.touched || showAll)) return '';
    return s.error || (s.complete ? '' : PARTS.find((p) => p.part === part)!.empty);
  };
  const nameError = cardholder.trim() ? '' : 'Enter the name as it appears on the card.';

  useImperativeHandle(ref, () => ({
    validate() {
      setShowAll(true);
      setNameTouched(true);
      const firstIncomplete = PARTS.find(({ part }) => !state[part].complete || state[part].error);
      if (firstIncomplete) elements.current[firstIncomplete.part]?.focus();
      return !firstIncomplete && !nameError;
    },
    async createPaymentMethod(billing) {
      if (!stripe.current || !elements.current.number) throw new Error('Card payments aren’t ready yet.');
      const { paymentMethod, error } = await stripe.current.createPaymentMethod({
        type: 'card',
        card: elements.current.number,
        billing_details: billing,
      });
      if (error || !paymentMethod) throw new Error(error?.message ?? 'We couldn’t read this card. Check the details and try again.');
      return { id: paymentMethod.id, brand: paymentMethod.card?.brand ?? 'card', last4: paymentMethod.card?.last4 ?? '' };
    },
  }));

  if (loadError) return <Notice tone="error">{loadError}</Notice>;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      {PARTS.map(({ part, label }) => (
        <FieldShell
          key={part}
          id={`card-${part}`}
          label={label}
          error={errorFor(part)}
          hint={part === 'number' ? 'Test card: 4242 4242 4242 4242, any future date and CVC. Declined: 4000 0000 0000 0002.' : undefined}
          className={part === 'number' ? 'col-span-2' : undefined}
        >
          <div className="relative">
            {/* Stripe mounts its iframe in here; the wrapper carries our input styling and focus ring. */}
            <div
              id={`card-${part}`}
              ref={(node) => { mounts.current[part] = node; }}
              className={inputClass(!!errorFor(part), cxFocus(state[part].focused, !!errorFor(part)) + ' flex flex-col justify-center py-2.5')}
            />
            {!ready && <Skeleton className="absolute inset-0 rounded-lg" />}
          </div>
        </FieldShell>
      ))}
      <TextField
        className="col-span-2"
        label="Name on card"
        autoComplete="cc-name"
        value={cardholder}
        onChange={onCardholderChange}
        onBlur={() => setNameTouched(true)}
        error={nameTouched || showAll ? nameError : ''}
      />
    </div>
  );
}

/** The iframe has the real focus, so mirror it onto the wrapper. */
function cxFocus(focused: boolean, invalid: boolean) {
  if (!focused) return '';
  return invalid ? 'border-red-600 ring-[3px] ring-red-600/20' : 'border-brand-600 ring-[3px] ring-brand-600/20';
}
