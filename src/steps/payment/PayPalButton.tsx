import { useEffect, useRef, useState } from 'react';
import { loadScript } from '../../lib/loadScript';
import { Notice, Skeleton } from '../../components/ui';

interface PayPalButtons {
  render(target: HTMLElement): Promise<void>;
  close(): Promise<void>;
}

type PayPalNamespace = {
  Buttons(options: {
    style?: object;
    onClick?: (data: unknown, actions: { resolve(): void; reject(): void }) => void;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }): PayPalButtons;
};

interface Props {
  clientId: string;
  currency: string;
  /** Runs when the button is clicked; return false to stop (e.g. terms not accepted). */
  canStart: () => boolean;
  createOrder: () => Promise<string>;
  onApprove: (paypalOrderId: string) => Promise<void>;
  onError: (message: string) => void;
}

/** PayPal's own button: it opens PayPal's window, then hands us the approved order to capture. */
export function PayPalButton({ clientId, currency, canStart, createOrder, onApprove, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // PayPal renders once; keep the latest callbacks in a ref instead of re-rendering the button.
  const handlers = useRef({ canStart, createOrder, onApprove, onError });
  handlers.current = { canStart, createOrder, onApprove, onError };

  useEffect(() => {
    let buttons: PayPalButtons | undefined;
    let cancelled = false;
    // One SDK per currency (it is fixed in the script URL), each under its own global name.
    const namespace = `paypal_${currency}`;
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons&disable-funding=card,credit,paylater`;
    setReady(false);
    loadScript(src, { 'data-namespace': namespace })
      .then(() => {
        if (cancelled || !container.current) return;
        const paypal = (window as unknown as Record<string, PayPalNamespace>)[namespace];
        buttons = paypal.Buttons({
          style: { layout: 'horizontal', color: 'gold', shape: 'rect', label: 'pay', height: 44, tagline: false },
          onClick: (_data, actions) => (handlers.current.canStart() ? actions.resolve() : actions.reject()),
          createOrder: () => handlers.current.createOrder(),
          onApprove: ({ orderID }) => handlers.current.onApprove(orderID),
          onError: () => handlers.current.onError('PayPal couldn’t complete the payment. No money was taken. Please try again.'),
        });
        return buttons.render(container.current).then(() => !cancelled && setReady(true));
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
      buttons?.close().catch(() => undefined);
    };
  }, [clientId, currency]);

  if (loadError) return <Notice tone="error">PayPal couldn’t load. Check your connection, or choose another way to pay.</Notice>;
  return (
    <div className="relative min-h-11">
      <div ref={container} />
      {!ready && <Skeleton className="absolute inset-0 h-11 rounded-lg" />}
    </div>
  );
}
