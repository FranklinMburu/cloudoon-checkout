// Hosting type picker; renders the configurator for the selected type.

import type { ReactNode } from 'react';
import type { ProductCategory } from '../../../api/types';
import { useStore } from '../../../state/store';
import { Cloud, Cpu, Layers, Server } from '../../../components/icons';
import { Notice, Section, cx } from '../../../components/ui';
import { CloudConfigurator } from './CloudConfigurator';
import { DedicatedConfigurator } from './DedicatedConfigurator';
import { SharedPlans } from './SharedPlans';
import { VpsConfigurator } from './VpsConfigurator';

const CATEGORY_ICONS: Record<ProductCategory, ReactNode> = {
  shared: <Layers size={18} />,
  vps: <Cpu size={18} />,
  dedicated: <Server size={18} />,
  cloud: <Cloud size={18} />,
};

export function HostingSection() {
  const { cart, catalog, update } = useStore();

  return (
    <Section id="hosting" title="Hosting">
      {cart.category === 'none' && (
        <Notice className="mb-3">This order is for domains only. Choose a hosting type to add hosting back.</Notice>
      )}
      <fieldset>
        <legend className="sr-only">Hosting type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {catalog.categories.map((c) => {
            const on = cart.category === c.slug;
            return (
              <label
                key={c.slug}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1',
                  on ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600' : 'border-gray-200 hover:border-gray-400',
                )}
              >
                <input type="radio" name="category" className="sr-only" checked={on} onChange={() => update({ category: c.slug })} />
                <span className={on ? 'text-brand-600' : 'text-gray-500'}>{CATEGORY_ICONS[c.slug]}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-950">{c.name}</span>
                  <span className="hidden text-xs text-gray-500 sm:block">{c.tagline}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        {cart.category === 'shared' && <SharedPlans />}
        {cart.category === 'vps' && <VpsConfigurator />}
        {cart.category === 'dedicated' && <DedicatedConfigurator />}
        {cart.category === 'cloud' && <CloudConfigurator />}
      </div>
    </Section>
  );
}
