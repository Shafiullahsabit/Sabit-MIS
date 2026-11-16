import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({ module }) {
  const Icon = module.icon;

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardContent className="px-6 py-12 text-center sm:px-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf4ea] text-[#507454]">
            <Icon size={25} strokeWidth={1.7} />
          </span>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7b907b]">
            Workspace module
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#26372c]">
            {module.label}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#818c83]">
            This module is part of the Sabit Super Store workspace and is ready
            for its next development phase.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f5f6f3] px-3 py-1.5 text-[11px] font-medium text-[#778178]">
            <Construction size={13} />
            Coming in a future release
          </div>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft size={14} />
                Back to dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
