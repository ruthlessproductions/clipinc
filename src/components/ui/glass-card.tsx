import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function GlassCard({
  className,
  hover = false,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-200",
        hover && "glass-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
