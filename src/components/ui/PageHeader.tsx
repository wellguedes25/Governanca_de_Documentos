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
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8", className)}>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="bg-foreground text-background p-3 rounded-none shadow-sm flex items-center justify-center shrink-0">
              <Icon size={24} strokeWidth={1.5} />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tighter leading-none flex items-center gap-2">
              {title}
            </h1>
            {badge && (
              <Badge variant="secondary" className="px-2 py-1 text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-none">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        {subtitle && (
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-2xl leading-relaxed mt-2 sm:mt-0 sm:ml-[60px]">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          {action}
        </div>
      )}
    </div>
  );
}
