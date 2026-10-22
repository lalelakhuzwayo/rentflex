import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * @type {React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>}
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        (<input
            type={type}
            className={cn(
                "flex h-10 w-full rounded-none border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-950 shadow-xs transition-all placeholder:text-zinc-400 focus-visible:outline-none focus-visible:shadow-card focus-visible:-translate-x-[1px] focus-visible:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props} />)
    );
})
Input.displayName = "Input"

export { Input }
