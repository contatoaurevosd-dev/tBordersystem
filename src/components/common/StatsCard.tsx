import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export const StatsCard = ({ icon, label, value, trend, className }: StatsCardProps) => {
  return (
    <div className={cn("glass-card p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.positive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
};
