"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged for diagnostics only; the UI never prints the message or stack.
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-20">
      <ErrorState
        action={
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        }
      />
      {error.digest && <p className="mt-3 text-center text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
