// Loads a third-party browser SDK (Stripe.js, PayPal) once per URL.

const pending = new Map<string, Promise<void>>();

export function loadScript(src: string, attributes: Record<string, string> = {}): Promise<void> {
  let promise = pending.get(src);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value));
      script.onload = () => resolve();
      script.onerror = () => {
        pending.delete(src);
        script.remove();
        reject(new Error(`Couldn’t load ${new URL(src).hostname}`));
      };
      document.head.appendChild(script);
    });
    pending.set(src, promise);
  }
  return promise;
}
