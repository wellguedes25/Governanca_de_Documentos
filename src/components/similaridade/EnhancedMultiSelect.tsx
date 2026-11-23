import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';

interface EnhancedMultiSelectProps {
  label: string;
  icon: React.ElementType;
  options: [string, number][];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}

/** Componente de Multi-seleção estilizado com o Design System Sylva */
export function EnhancedMultiSelect({ 
  label, 
  icon: Icon, 
  options, 
  value, 
  onChange, 
  placeholder 
}: EnhancedMultiSelectProps) {
  return (
    <div className="flex-1 min-w-[200px] space-y-1.5 h-full">
      <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
        <Icon size={12} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> {label}
      </label>
      <Listbox value={value} onChange={onChange} multiple>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className="relative w-full bg-[var(--card-bg)]/70 border border-[var(--border-subtle)] hover:border-[var(--lime-dark)] dark:hover:border-[var(--lime)] rounded-xl px-3 py-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--lime)]/20 group cursor-pointer shadow-xs">
              <span className="block truncate text-xs font-medium text-[var(--foreground)]">
                {value.length === 0 ? (
                  <span className="text-[var(--muted)] font-normal">{placeholder}</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {value.slice(0, 2).map((v: string) => (
                      <span key={v} className="bg-[var(--lime)] text-[var(--lime-ink)] text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                        {String(v).split(' - ')[0]}
                      </span>
                    ))}
                    {value.length > 2 && (
                      <span className="text-[10px] text-[var(--foreground-secondary)] font-bold self-center">+{value.length - 2}</span>
                    )}
                  </div>
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                <ChevronDown className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-[100] mt-1.5 max-h-64 w-full overflow-auto rounded-xl bg-[var(--dock-bg)] border border-[var(--border-subtle)] py-1 shadow-2xl backdrop-blur-xl focus:outline-none scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-200">
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-xs font-medium text-[var(--muted)] text-center">Nenhum dado disponível</div>
                ) : (
                  options.map(([item, count]) => (
                    <Listbox.Option
                      key={item}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-9 pr-3 transition-colors ${
                          active 
                            ? 'bg-[var(--card-bg)] text-[var(--foreground)]' 
                            : 'text-[var(--foreground-secondary)]'
                        }`
                      }
                      value={item}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate text-xs ${selected ? 'font-bold text-[var(--foreground)]' : 'font-medium'}`}>
                            {item} <span className="text-[var(--muted)] text-[10px] ml-1">({count})</span>
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[var(--lime-dark)] dark:text-[var(--lime)]">
                              <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                            </span>
                          ) : (
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                              <div className="h-3.5 w-3.5 border border-[var(--border-subtle)] rounded-sm bg-[var(--card-bg)]" />
                            </div>
                          )}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
}
