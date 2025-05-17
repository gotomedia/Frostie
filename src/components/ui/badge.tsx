import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "status"
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && 
          "border-transparent bg-blue-500 text-white",
        variant === "secondary" && 
          "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50",
        variant === "destructive" && 
          "border-transparent bg-red-500 text-white",
        variant === "outline" && 
          "text-slate-950 dark:border-slate-800 dark:text-slate-50",
        className
      )}
      {...props}
    />
  )
}

export { Badge }