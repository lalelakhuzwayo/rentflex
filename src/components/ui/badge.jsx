import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-zinc-900 text-white shadow-none hover:bg-zinc-800",
                secondary:
                    "border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
                destructive:
                    "border-transparent bg-rose-700 text-white shadow-none hover:bg-rose-800",
                outline: "border-zinc-300 text-zinc-900 bg-white",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({
    className,
    variant,
    ...props
}) {
    return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
