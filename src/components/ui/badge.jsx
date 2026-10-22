import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-none border border-zinc-200/90 px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors shadow-xs",
    {
        variants: {
            variant: {
                default:
                    "bg-zinc-950 text-white border-zinc-950",
                secondary:
                    "bg-zinc-100 text-zinc-900 border-zinc-200",
                destructive:
                    "bg-rose-600 text-white border-rose-700",
                outline: "bg-white text-zinc-950 border-zinc-300",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

/**
 * @type {React.FC<React.HTMLAttributes<HTMLDivElement> & { variant?: any }>}
 */
function Badge({
    className,
    variant,
    ...props
}) {
    return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
