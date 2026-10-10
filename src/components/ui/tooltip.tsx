import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "../../lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = forwardRef<ElementRef<typeof TooltipPrimitive.Content>, ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, sideOffset = 6, ...props }, ref) => <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-md", className)} {...props} />);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
