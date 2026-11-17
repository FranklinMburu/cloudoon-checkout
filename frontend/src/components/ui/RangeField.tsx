// Slider with a 44px hit area and live value.

import { useId } from 'react';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display: string;
  price?: string;
  minLabel: string;
  maxLabel: string;
  valueText?: string;
}

export function RangeField({ label, value, min, max, step = 1, onChange, display, price, minLabel, maxLabel, valueText }: RangeFieldProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-gray-900">{label}</label>
        <span className="text-[13px] text-gray-500 tabular-nums">
          <span className="text-sm font-semibold text-gray-950">{display}</span>
          {price && <span className="ml-1.5">· {price}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText ?? display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range h-11 w-full cursor-pointer"
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      <div className="-mt-1 flex justify-between text-xs text-gray-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
