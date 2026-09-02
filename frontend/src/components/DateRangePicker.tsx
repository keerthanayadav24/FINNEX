import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown } from 'lucide-react';
import { DateRange, DateRangePreset, DATE_RANGE_LABELS } from '../utils/dateRanges';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (newRange: DateRange) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 224 });
  const pickerId = useId();
  const DROPDOWN_ID = `date-range-picker-${pickerId}`;

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // 14rem / w-56
      let left = rect.right - dropdownWidth;
      if (left < 16) {
        left = Math.max(16, rect.left);
      }
      setCoords({
        top: rect.bottom + 8,
        left: left,
        width: dropdownWidth,
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent('close-all-dropdowns', { detail: { id: DROPDOWN_ID } }));
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id !== DROPDOWN_ID) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('close-all-dropdowns', handleCloseAll);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('close-all-dropdowns', handleCloseAll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [DROPDOWN_ID]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'CUSTOM') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      onChange({
        preset: 'CUSTOM',
        customFrom: value.customFrom || firstDay,
        customTo: value.customTo || today,
      });
    } else {
      onChange({ preset });
    }
    setIsOpen(false);
  };

  const handleCustomFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      preset: 'CUSTOM',
      customFrom: e.target.value,
    });
  };

  const handleCustomToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      preset: 'CUSTOM',
      customTo: e.target.value,
    });
  };

  const displayLabel = DATE_RANGE_LABELS[value.preset] || 'This Month';

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
          View:
        </label>

        <div>
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggle}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{displayLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {value.preset === 'CUSTOM' && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs">
            <span className="text-[11px] text-slate-400 pl-1">From</span>
            <input
              type="date"
              value={value.customFrom || ''}
              onChange={handleCustomFromChange}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[11px] text-slate-400">To</span>
            <input
              type="date"
              value={value.customTo || ''}
              onChange={handleCustomToChange}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-auto">
            <div
              className="fixed inset-0 bg-transparent"
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
              }}
              className="rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-[100000] py-2 divide-y divide-slate-800/60 pointer-events-auto"
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Period
              </div>
              <div className="py-1 max-h-72 overflow-y-auto">
                {(Object.keys(DATE_RANGE_LABELS) as DateRangePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                      value.preset === preset
                        ? 'bg-cyan-500/10 text-cyan-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span>{DATE_RANGE_LABELS[preset]}</span>
                    {value.preset === preset && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
