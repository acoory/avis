import Image from "next/image";
import { cn } from "@/lib/utils";

type ReadylineBrandProps = {
  className?: string;
  priority?: boolean;
  showTagline?: boolean;
  size?: "compact" | "default" | "large";
};

const styles = {
  compact: {
    image: "h-8 w-8",
    name: "text-sm",
    tagline: "text-[10px]",
  },
  default: {
    image: "h-10 w-10",
    name: "text-base",
    tagline: "text-xs",
  },
  large: {
    image: "h-14 w-14",
    name: "text-2xl",
    tagline: "text-sm",
  },
};

export function ReadylineBrand({
  className,
  priority = false,
  showTagline = true,
  size = "default",
}: ReadylineBrandProps) {
  const style = styles[size];

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Image
        alt=""
        aria-hidden="true"
        className={cn("shrink-0 rounded-xl object-contain", style.image)}
        height={96}
        priority={priority}
        src="/favicon/favicon-96x96.png"
        width={96}
      />
      <div className="min-w-0">
        <p className={cn("truncate font-semibold tracking-tight text-teal-800", style.name)}>
          Readyline
        </p>
        {showTagline ? (
          <p className={cn("truncate text-gray-500", style.tagline)}>
            Contrôler, décider, suivre.
          </p>
        ) : null}
      </div>
    </div>
  );
}
