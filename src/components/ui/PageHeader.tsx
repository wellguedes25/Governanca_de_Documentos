import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode | string;
  className?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  kicker,
  icon: Icon,
  badge,
  className,
  action,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 w-full", className)}>
      <div className="flex flex-col gap-1.5 min-w-0">
        {kicker && (
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
              {kicker}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-2xl sylva-pill text-[var(--accent-ink)] flex items-center justify-center shrink-0">
              <Icon size={19} strokeWidth={2} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight leading-tight relative inline-block pb-1">
              {title}
              <span className="absolute left-0 bottom-0 h-[3px] w-16 rounded-full bg-[var(--lime)]" />
            </h1>
            {badge &&
              (typeof badge === 'string' ? (
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full border-[var(--border-strong)] bg-[var(--card-subtle)] text-[var(--foreground-secondary)]"
                >
                  {badge}
                </Badge>
              ) : (
                badge
              ))}
          </div>
        </div>
        {subtitle && (
          <p
            className={cn(
              "text-xs md:text-[13px] text-[var(--foreground-secondary)] font-normal max-w-3xl leading-relaxed mt-0.5",
              Icon ? "sm:pl-[52px]" : ""
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
