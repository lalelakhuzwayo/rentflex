import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-zinc-900 text-white hover:bg-zinc-800 shadow-none",
                destructive:
                    "bg-rose-700 text-white hover:bg-rose-800 shadow-none",
                outline:
                    "border border-zinc-300 bg-white text-zinc-900 shadow-none hover:bg-zinc-100 hover:border-zinc-900",
                secondary:
                    "bg-zinc-100 text-zinc-900 shadow-none hover:bg-zinc-200",
                ghost: "hover:bg-zinc-100 hover:text-zinc-900",
                link: "text-zinc-900 underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-11 px-8 text-base",
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
