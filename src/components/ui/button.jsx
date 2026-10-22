import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-zinc-950 text-white border border-zinc-900 shadow-sm hover:bg-zinc-900 hover:shadow-md hover:-translate-y-[1px] active:translate-y-[0px] active:shadow-sm",
                destructive:
                    "bg-rose-600 text-white border border-rose-700 shadow-sm hover:bg-rose-700 hover:shadow-md hover:-translate-y-[1px] active:translate-y-[0px] active:shadow-sm",
                outline:
                    "border border-zinc-300 bg-white text-zinc-950 shadow-xs hover:bg-zinc-50 hover:border-zinc-400 hover:shadow-sm hover:-translate-y-[1px] active:translate-y-[0px] active:shadow-xs",
                secondary:
                    "bg-zinc-100 text-zinc-900 border border-zinc-200/90 shadow-xs hover:bg-zinc-200 hover:shadow-sm hover:-translate-y-[1px] active:translate-y-[0px]",
                ghost: "hover:bg-zinc-100 hover:text-zinc-900 border border-transparent",
                link: "text-zinc-950 underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-11 px-6 text-base",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

/**
 * @type {React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: any, size?: any, asChild?: boolean } & React.RefAttributes<HTMLButtonElement>>}
 */
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
        (<Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props} />)
    );
})
Button.displayName = "Button"

export { Button, buttonVariants }
