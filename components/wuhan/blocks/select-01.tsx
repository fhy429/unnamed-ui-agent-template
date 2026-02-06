import * as React from "react";
import { cn } from "@/lib/utils";

export const SelectContainerPrimitive = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("", className)} {...props} />;
});
SelectContainerPrimitive.displayName = "SelectContainerPrimitive";
