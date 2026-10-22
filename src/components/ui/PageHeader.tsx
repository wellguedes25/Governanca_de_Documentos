import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  badge?: string;
  className?: string;
  action?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  badge, 
  className,
  action
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pt-1 sm:pt-2", className)}>
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0 shadow-xs">
              <Icon size={20} strokeWidth={2} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none">
              {title}
            </h1>
            {badge && (
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 font-normal max-w-2xl leading-relaxed sm:ml-[54px]">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
