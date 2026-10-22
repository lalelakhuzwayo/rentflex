import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<textarea
            className={cn(
                "flex min-h-[80px] w-full rounded-none border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-950 shadow-xs transition-all placeholder:text-zinc-400 focus-visible:outline-none focus-visible:shadow-card focus-visible:-translate-x-[1px] focus-visible:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props} />)
    );
})
Textarea.displayName = "Textarea"

export { Textarea }
