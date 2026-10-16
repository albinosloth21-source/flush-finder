import { useState } from "react";
import { Navigation } from "lucide-react";
import { NAV_APPS, defaultNavApp, openNav, type NavApp } from "@/lib/directions";
import { cn } from "@/lib/utils";

/** Gold "Take me there" button with a small Apple / Google / Waze chooser. Works without location. */
export function TakeMeThere({
  dest,
  className,
  compact = false,
}: {
  dest: { lat: number; lng: number; name?: string };
  className?: string;
  compact?: boolean;
}) {
  const [app, setApp] = useState<NavApp>(() => defaultNavApp());
  const label = NAV_APPS.find((item) => item.id === app)?.label ?? "Maps";
  if (compact) {
    return (
      <button
        type="button"
        className={cn("ff-gold-button ff-take-compact", className)}
        onClick={(e) => {
          e.stopPropagation();
          openNav(app, dest);
        }}
        aria-label={`Take me there with ${label}${dest.name ? `: ${dest.name}` : ""}`}
      >
        <Navigation className="size-3.5" />
        Go
      </button>
    );
  }
  return (
    <div className={cn("ff-take", className)} data-ff-take-me-there="true">
      <button type="button" className="ff-gold-button w-full" onClick={() => openNav(app, dest)}>
        <Navigation className="size-4" />
        Take me there
        <span className="text-[0.75rem] font-medium opacity-75">· {label}</span>
      </button>
      <div className="mt-1.5 flex items-center gap-1.5" role="radiogroup" aria-label="Directions app">
        <span className="shrink-0 text-[0.6875rem] text-subtle">Royal escort:</span>
        {NAV_APPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={app === item.id}
            className={cn("ff-take-chip", app === item.id && "is-on")}
            onClick={() => setApp(item.id)}
          >
            {item.label.replace(" Maps", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
