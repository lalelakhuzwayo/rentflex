import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * @type {React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & React.RefAttributes<HTMLDivElement>>}
 */
const TabsList = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            "inline-flex h-auto items-center justify-start bg-transparent p-0 text-zinc-500 border-none gap-2 flex-wrap",
            className
        )}
        {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * @type {React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & React.RefAttributes<HTMLButtonElement>>}
 */
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-none px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-zinc-600 bg-white border-2 border-zinc-200 hover:border-zinc-950 hover:text-zinc-950 shadow-xs data-[state=active]:bg-zinc-950 data-[state=active]:text-white data-[state=active]:border-zinc-950 data-[state=active]:shadow-sm data-[state=active]:-translate-x-[1px] data-[state=active]:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px]",
            className
        )}
        {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * @type {React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & React.RefAttributes<HTMLDivElement>>}
 */
const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn(
            "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
            className
        )}
        {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
