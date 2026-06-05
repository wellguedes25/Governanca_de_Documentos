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

/** Componente de Multi-seleção estilizado com Headless UI */
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
      <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
        <Icon size={10} /> {label}
      </label>
      <Listbox value={value} onChange={onChange} multiple>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className="relative w-full -background border-2 -border hover:border-blue-500/50 rounded-[var(--radius)] px-3 py-2 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 group">
              <span className="block truncate text-[11px] font-bold text-foreground">
                {value.length === 0 ? (
                  <span className="-muted italic font-medium">{placeholder}</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {value.slice(0, 2).map((v: string) => (
                      <span key={v} className="bg-blue-600 text-[9px] px-1.5 py-0.5 rounded text-foreground font-black uppercase tracking-tighter">
                        {String(v).split(' - ')[0]}
                      </span>
                    ))}
                    {value.length > 2 && (
                      <span className="text-[9px] text-muted font-bold">+{value.length - 2}</span>
                    )}
                  </div>
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-[100] mt-1.5 max-h-64 w-full overflow-auto rounded-[var(--radius)] bg-card border -border py-1 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none scrollbar-thin scrollbar-thumb-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-[10px] font-bold text-muted uppercase italic text-center">Nenhum dado disponível</div>
                ) : (
                  options.map(([item, count]) => (
                    <Listbox.Option
                      key={item}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${active ? 'bg-blue-600/20 text-blue-400' : 'text-foreground'}`
                      }
                      value={item}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate text-[11px] ${selected ? 'font-black text-blue-400' : 'font-medium'}`}>
                            {item} <span className="opacity-40 text-[9px] ml-1">({count})</span>
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500">
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : (
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                              <div className="h-3 w-3 border-2 -border rounded-sm" />
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
