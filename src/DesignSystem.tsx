// Reference page for reviewers: brand tokens, every component state, and the
// app rendered live inside 375px and 1440px breakpoint frames.
// Open it from the footer link or at /#design-system.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Logo } from './components/Header';
import { ArrowLeft, Lock } from './components/icons';
import { Badge, Button, Notice, Quantity, RadioCard, Segmented, Skeleton, Switch, TextField, cx } from './components/ui';

const COLORS = [
  { name: 'Primary', hex: '#395AF4', token: 'brand-600', use: 'Actions, active states, links, navigation', contrast: '5.3:1 with white text — AA' },
  { name: 'Primary dark', hex: '#2A45D1', token: 'brand-700', use: 'Hover, text links on white', contrast: '7.3:1 on white — AAA' },
  { name: 'Accent', hex: '#E7A403', token: 'accent-400', use: 'Conversion buttons, promo & discount badges', contrast: '9.3:1 with gray-950 text — AAA' },
  { name: 'Ink', hex: '#030712', token: 'gray-950', use: 'Headings and body text', contrast: '20.1:1 on white' },
  { name: 'Success', hex: '#15803D', token: 'green-700', use: 'Valid fields, savings, free items', contrast: '5.0:1 on white — AA' },
  { name: 'Error', hex: '#B91C1C', token: 'red-700', use: 'Validation errors, declines', contrast: '6.5:1 on white — AA' },
];

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
      {description && <p className="mt-0.5 mb-4 text-sm text-gray-600">{description}</p>}
      <div className={description ? '' : 'mt-4'}>{children}</div>
    </section>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {children}
      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</span>
    </div>
  );
}

/** Static replicas of a button in a forced state (real buttons only show it on interaction). */
function ForcedButton({ variant, state }: { variant: 'primary' | 'accent' | 'secondary'; state: 'default' | 'hover' | 'active' | 'focus' | 'disabled' }) {
  const bg: Record<string, Record<string, string>> = {
    primary: { default: '#395AF4', hover: '#2A45D1', active: '#2338A8' },
    accent: { default: '#E7A403', hover: '#F4C443', active: '#C98E02' },
    secondary: { default: '#fff', hover: '#F9FAFB', active: '#F3F4F6' },
  };
  const style: CSSProperties = { background: bg[variant][state] ?? bg[variant].default };
  return (
    <span
      style={style}
      className={cx(
        'inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold',
        variant === 'primary' && 'text-white',
        variant === 'accent' && 'text-gray-950',
        variant === 'secondary' && 'border border-gray-300 text-gray-900',
        state === 'focus' && 'ring-2 ring-brand-600 ring-offset-2',
        state === 'disabled' && 'opacity-50',
      )}
    >
      {variant === 'accent' ? 'Pay now' : variant === 'primary' ? 'Search' : 'Cancel'}
    </span>
  );
}

export function DesignSystem() {
  const [sw, setSw] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [qty, setQty] = useState(2);
  const frameSrc = window.location.pathname + window.location.search;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <a href="#" className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            <ArrowLeft size={16} /> Back to checkout
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950">Design system & UI states</h1>
          <p className="mt-1 text-gray-600">Tokens and components used across the checkout, with every interactive state shown side by side.</p>
        </div>

        <Block title="Colour" description="Contrast ratios are measured against the background each colour is used on (WCAG 2.2).">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COLORS.map((c) => (
              <div key={c.hex} className="flex gap-3 rounded-xl border border-gray-200 p-3">
                <span className="h-14 w-14 shrink-0 rounded-lg border border-black/5" style={{ background: c.hex }} />
                <div className="text-sm">
                  <p className="font-semibold text-gray-950">{c.name} <span className="font-mono text-xs font-normal text-gray-500">{c.hex}</span></p>
                  <p className="text-gray-600">{c.use}</p>
                  <p className="text-xs text-gray-500">{c.contrast}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Typography" description="Inter, one family. Sizes step clearly so the hierarchy reads at a glance.">
          <div className="space-y-2">
            <p className="text-3xl font-bold tracking-tight">Page title — 30/36 bold</p>
            <p className="text-lg font-semibold">Section heading — 18/28 semibold</p>
            <p className="text-base">Body — 16/24 regular. Inputs use 16px on mobile to prevent zoom.</p>
            <p className="text-sm text-gray-600">Supporting text — 14/20, gray-600 (7.6:1)</p>
            <p className="text-2xl font-bold tabular-nums">$107.64 <span className="text-sm font-normal text-gray-600">tabular figures for prices</span></p>
          </div>
        </Block>

        <Block title="Buttons" description="Accent is reserved for the one conversion action on a screen. Every button is at least 44px tall.">
          <div className="space-y-5">
            {(['accent', 'primary', 'secondary'] as const).map((v) => (
              <div key={v} className="flex flex-wrap gap-6">
                {(['default', 'hover', 'active', 'focus', 'disabled'] as const).map((s) => (
                  <State key={s} label={`${v} · ${s}`}><ForcedButton variant={v} state={s} /></State>
                ))}
                <State label={`${v} · loading`}><Button variant={v} loading>Working…</Button></State>
              </div>
            ))}
            <div className="flex flex-wrap gap-6">
              <State label="Live — try hover, click, Tab"><Button variant="accent"><Lock size={16} /> Pay $107.64 now</Button></State>
              <State label="Ghost"><Button variant="ghost">Forgot password?</Button></State>
              <State label="Destructive ghost"><Button variant="danger-ghost">Remove</Button></State>
            </div>
          </div>
        </Block>

        <Block title="Form fields" description="Errors appear after you leave a field, then update live as you type. Errors always say how to fix the problem.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Default" value="" onChange={() => {}} placeholder="name@company.com" hint="Helper text explains the field." />
            <TextField label="Focus (click me)" value="" onChange={() => {}} placeholder="Focus ring uses the primary colour" />
            <TextField label="Valid" value="amina@cloudoon.com" onChange={() => {}} valid />
            <TextField label="Error" value="amina@" onChange={() => {}} error="Enter an email like name@company.com." />
            <TextField label="Disabled" value="Locked value" onChange={() => {}} disabled />
            <TextField label="Optional" optional value="" onChange={() => {}} placeholder="Company name" />
          </div>
        </Block>

        <Block title="Selection controls">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Switch checked={sw} onChange={setSw} label="Switch — on/off (live)" description="The whole row is the touch target." price="+$2.99/mo" />
              <Switch checked={false} onChange={() => {}} disabled label="Switch — disabled" description="Reason is always given in text." />
            </div>
            <div className="space-y-3">
              <Segmented label="Segmented" fullWidth value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Selected' }, { value: 'b', label: 'Unselected' }]} />
              <Quantity label="Mailboxes" value={qty} min={0} max={5} onChange={setQty} />
            </div>
            <div className="grid grid-cols-3 gap-2 lg:col-span-2">
              <RadioCard name="demo" value="1" checked onChange={() => {}}><span className="font-semibold">Selected</span></RadioCard>
              <RadioCard name="demo" value="2" checked={false} onChange={() => {}}><span className="font-semibold">Default / hover</span></RadioCard>
              <RadioCard name="demo" value="3" checked={false} disabled onChange={() => {}}><span className="font-semibold">Disabled</span></RadioCard>
            </div>
          </div>
        </Block>

        <Block title="Feedback">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Notice>Info — neutral guidance.</Notice>
              <Notice tone="success">Success — promo applied.</Notice>
              <Notice tone="warning">Warning — needs attention.</Notice>
              <Notice tone="error">Error — your card was declined. No money was taken.</Notice>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">Save 40%</Badge>
                <Badge tone="accent">Most popular</Badge>
                <Badge tone="success">Free 1st year</Badge>
                <Badge tone="brand">Save 20%</Badge>
                <Badge tone="danger">Out of stock</Badge>
                <Badge>No discount</Badge>
              </div>
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Skeleton loader (domain search)</p>
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-11 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        </Block>

        <Block title="Breakpoint frames" description="The live checkout at 375px (mobile) and 1440px (desktop, shown at 50%). Both frames share the same saved cart.">
          <div className="flex flex-wrap items-start gap-8 overflow-x-auto pb-2">
            <figure>
              <div className="overflow-hidden rounded-[2rem] border-8 border-gray-900 shadow-lg">
                <iframe title="Checkout at 375px" src={frameSrc} width={375} height={760} className="block bg-white" />
              </div>
              <figcaption className="mt-2 text-center text-sm text-gray-600">Mobile · 375 × 760</figcaption>
            </figure>
            <figure>
              <div className="overflow-hidden rounded-xl border border-gray-300 shadow-lg" style={{ width: 720, height: 450 }}>
                <iframe title="Checkout at 1440px" src={frameSrc} width={1440} height={900} className="block origin-top-left scale-50 bg-white" />
              </div>
              <figcaption className="mt-2 text-center text-sm text-gray-600">Desktop · 1440 × 900 (50%)</figcaption>
            </figure>
          </div>
        </Block>
      </main>
    </div>
  );
}
