import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ebaa1] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#294b34] text-white shadow-sm hover:bg-[#203d2a]",
        outline:
          "border border-[#e2e8e1] bg-white text-[#46544a] hover:bg-[#f7f9f6]",
        ghost: "text-[#68766b] hover:bg-[#f3f6f2] hover:text-[#314438]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}
