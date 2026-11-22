import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Marks data that is SAMPLE / SIMULATED (`isSimulated = true` in the database).
 * Required wherever such a value is displayed — never present it as verified.
 */
export function SampleBadge({ label = "Sample data" }: { label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="warning" className="cursor-help">
          <FlaskConical /> {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Simulated for demonstration. This is not a verified measurement or a live price.
      </TooltipContent>
    </Tooltip>
  );
}
