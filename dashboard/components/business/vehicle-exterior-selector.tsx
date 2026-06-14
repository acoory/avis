"use client";

import {
  Armchair,
  Car,
  CarFront,
  CircleDot,
  ListPlus,
  MousePointer2,
  PackageOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { VehiclePart } from "@/types/business";

type VehicleView = "FRONT" | "LEFT" | "RIGHT" | "REAR";
type VehicleArea = "EXTERIOR" | "INTERIOR";

type Zone = {
  code: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type VehicleExteriorSelectorProps = {
  selectedPartCounts: Record<string, number>;
  vehicleParts: VehiclePart[];
  onSelect: (vehiclePart: VehiclePart) => void;
};

const views: Array<{ id: VehicleView; label: string; icon: typeof Car }> = [
  { id: "FRONT", label: "Avant", icon: CarFront },
  { id: "LEFT", label: "Cote gauche", icon: Car },
  { id: "RIGHT", label: "Cote droit", icon: Car },
  { id: "REAR", label: "Arriere", icon: CarFront },
];

const imageByView: Record<VehicleView, string> = {
  FRONT: "/vehicle-inspection/front.png",
  LEFT: "/vehicle-inspection/left.png",
  RIGHT: "/vehicle-inspection/right.png",
  REAR: "/vehicle-inspection/rear.png",
};

const zonesByView: Record<VehicleView, Zone[]> = {
  FRONT: [
    { code: "WINDSHIELD", label: "Pare-brise", x: 205, y: 38, width: 230, height: 62 },
    { code: "HOOD", label: "Capot", x: 190, y: 102, width: 260, height: 62 },
    { code: "FRONT_LEFT_FENDER", label: "Aile avant gauche", x: 146, y: 132, width: 62, height: 88 },
    { code: "FRONT_RIGHT_FENDER", label: "Aile avant droite", x: 432, y: 132, width: 62, height: 88 },
    { code: "FRONT_LEFT_HEADLIGHT", label: "Phare avant gauche", x: 168, y: 142, width: 94, height: 34 },
    { code: "FRONT_RIGHT_HEADLIGHT", label: "Phare avant droit", x: 378, y: 142, width: 94, height: 34 },
    { code: "FRONT_BUMPER", label: "Pare-chocs avant", x: 162, y: 181, width: 316, height: 76 },
  ],
  LEFT: [
    { code: "ROOF", label: "Toit", x: 270, y: 55, width: 220, height: 30 },
    { code: "WINDSHIELD", label: "Pare-brise", x: 213, y: 76, width: 65, height: 58 },
    { code: "LEFT_MIRROR", label: "Retroviseur gauche", x: 228, y: 106, width: 48, height: 32 },
    { code: "FRONT_LEFT_FENDER", label: "Aile avant gauche", x: 80, y: 137, width: 135, height: 78 },
    { code: "FRONT_LEFT_DOOR", label: "Porte avant gauche", x: 214, y: 132, width: 138, height: 92 },
    { code: "REAR_LEFT_DOOR", label: "Porte arriere gauche", x: 354, y: 132, width: 126, height: 92 },
    { code: "REAR_LEFT_FENDER", label: "Aile arriere gauche", x: 482, y: 137, width: 112, height: 78 },
    { code: "FRONT_LEFT_SIDE_MOLDING", label: "Baguette avant gauche", x: 229, y: 214, width: 112, height: 24 },
    { code: "REAR_LEFT_SIDE_MOLDING", label: "Baguette arriere gauche", x: 362, y: 214, width: 108, height: 24 },
  ],
  RIGHT: [
    { code: "ROOF", label: "Toit", x: 150, y: 55, width: 220, height: 30 },
    { code: "WINDSHIELD", label: "Pare-brise", x: 362, y: 76, width: 65, height: 58 },
    { code: "RIGHT_MIRROR", label: "Retroviseur droit", x: 367, y: 106, width: 48, height: 32 },
    { code: "REAR_RIGHT_FENDER", label: "Aile arriere droite", x: 46, y: 137, width: 112, height: 78 },
    { code: "REAR_RIGHT_DOOR", label: "Porte arriere droite", x: 160, y: 132, width: 126, height: 92 },
    { code: "FRONT_RIGHT_DOOR", label: "Porte avant droite", x: 288, y: 132, width: 138, height: 92 },
    { code: "FRONT_RIGHT_FENDER", label: "Aile avant droite", x: 428, y: 137, width: 135, height: 78 },
    { code: "REAR_RIGHT_SIDE_MOLDING", label: "Baguette arriere droite", x: 170, y: 214, width: 108, height: 24 },
    { code: "FRONT_RIGHT_SIDE_MOLDING", label: "Baguette avant droite", x: 299, y: 214, width: 112, height: 24 },
  ],
  REAR: [
    { code: "REAR_WINDOW", label: "Lunette arriere", x: 210, y: 42, width: 220, height: 66 },
    { code: "TAILGATE", label: "Hayon", x: 203, y: 112, width: 234, height: 88 },
    { code: "REAR_LEFT_FENDER", label: "Aile arriere gauche", x: 158, y: 126, width: 62, height: 92 },
    { code: "REAR_RIGHT_FENDER", label: "Aile arriere droite", x: 420, y: 126, width: 62, height: 92 },
    { code: "REAR_LEFT_LIGHT", label: "Feu arriere gauche", x: 176, y: 118, width: 88, height: 36 },
    { code: "REAR_RIGHT_LIGHT", label: "Feu arriere droit", x: 376, y: 118, width: 88, height: 36 },
    { code: "REAR_BUMPER", label: "Pare-chocs arriere", x: 166, y: 204, width: 308, height: 60 },
  ],
};

const wheelCodes = [
  "FRONT_LEFT_TIRE",
  "FRONT_RIGHT_TIRE",
  "REAR_LEFT_TIRE",
  "REAR_RIGHT_TIRE",
  "FRONT_LEFT_RIM",
  "FRONT_RIGHT_RIM",
  "REAR_LEFT_RIM",
  "REAR_RIGHT_RIM",
];

const interiorZones: Zone[] = [
  { code: "PASSENGER_SEAT", label: "Siege passager", x: 220, y: 62, width: 126, height: 96 },
  { code: "DRIVER_SEAT", label: "Siege conducteur", x: 220, y: 164, width: 126, height: 96 },
  { code: "REAR_BENCH", label: "Banquette arriere", x: 366, y: 62, width: 110, height: 198 },
  { code: "LUGGAGE_COVER", label: "Cache bagages", x: 490, y: 68, width: 102, height: 184 },
];

const accessoryCodes = ["KEY", "CHARGING_CABLE", "WHEEL_COVER"];

export function VehicleExteriorSelector({
  selectedPartCounts,
  vehicleParts,
  onSelect,
}: VehicleExteriorSelectorProps) {
  const [activeArea, setActiveArea] = useState<VehicleArea>("EXTERIOR");
  const [activeView, setActiveView] = useState<VehicleView>("LEFT");
  const partsByCode = useMemo(
    () => new Map(vehicleParts.map((part) => [part.code, part])),
    [vehicleParts],
  );
  const activeZones = useMemo(
    () =>
      [...zonesByView[activeView]].sort(
        (first, second) => second.width * second.height - first.width * first.height,
      ),
    [activeView],
  );
  const activeParts = useMemo(
    () =>
      zonesByView[activeView]
        .map((zone) => partsByCode.get(zone.code))
        .filter((part): part is VehiclePart => Boolean(part)),
    [activeView, partsByCode],
  );
  const interiorParts = useMemo(
    () =>
      interiorZones
        .map((zone) => partsByCode.get(zone.code))
        .filter((part): part is VehiclePart => Boolean(part)),
    [partsByCode],
  );

  function selectCode(code: string) {
    const part = partsByCode.get(code);
    if (part) onSelect(part);
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-950">Selection visuelle</p>
            <p className="mt-0.5 text-xs text-gray-500">Touchez la zone endommagee.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 rounded-md bg-gray-100 p-1">
          <button
            aria-pressed={activeArea === "EXTERIOR"}
            className={[
              "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              activeArea === "EXTERIOR"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-gray-600 hover:text-gray-950",
            ].join(" ")}
            type="button"
            onClick={() => setActiveArea("EXTERIOR")}
          >
            <Car className="h-4 w-4" />
            Exterieur
          </button>
          <button
            aria-pressed={activeArea === "INTERIOR"}
            className={[
              "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              activeArea === "INTERIOR"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-gray-600 hover:text-gray-950",
            ].join(" ")}
            type="button"
            onClick={() => setActiveArea("INTERIOR")}
          >
            <Armchair className="h-4 w-4" />
            Interieur
          </button>
        </div>
        {activeArea === "EXTERIOR" ? (
          <div className="mt-2 grid grid-cols-4 rounded-md bg-gray-100 p-1">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              return (
                <button
                  aria-pressed={isActive}
                  className={[
                    "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-xs font-medium transition-colors sm:flex-row sm:px-2",
                    isActive
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-gray-600 hover:text-gray-950",
                  ].join(" ")}
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{view.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-md border border-gray-200 bg-[linear-gradient(#ffffff,#f3f4f6)]">
          <svg
            aria-label={
              activeArea === "EXTERIOR"
                ? `Vue ${views.find((view) => view.id === activeView)?.label} du vehicule`
                : "Vue interieure du vehicule"
            }
            className="block h-auto w-full"
            role="img"
            viewBox="0 0 640 320"
          >
            <image
              height="320"
              href={
                activeArea === "EXTERIOR"
                  ? imageByView[activeView]
                  : "/vehicle-inspection/interior.png"
              }
              preserveAspectRatio="xMidYMid meet"
              width="640"
            />
            {(activeArea === "EXTERIOR" ? activeZones : interiorZones).map((zone) => {
              const part = partsByCode.get(zone.code);
              if (!part) return null;
              const hitArea = getHitArea(zone);
              const selectedCount = selectedPartCounts[part.id] ?? 0;

              return (
                <g
                  aria-label={part.name}
                  className="group cursor-pointer outline-none"
                  key={zone.code}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectCode(zone.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectCode(zone.code);
                    }
                  }}
                >
                  <title>{part.name}</title>
                  <rect
                    fill="transparent"
                    height={hitArea.height}
                    pointerEvents="all"
                    rx="12"
                    width={hitArea.width}
                    x={hitArea.x}
                    y={hitArea.y}
                  />
                  <rect
                    aria-hidden="true"
                    className={[
                      "transition-all group-hover:fill-teal-400/35 group-hover:stroke-teal-800 group-focus:fill-teal-400/35 group-focus:stroke-teal-800",
                      selectedCount
                        ? "fill-teal-500/45 stroke-teal-900"
                        : "fill-teal-500/10 stroke-teal-700/70",
                    ].join(" ")}
                    height={zone.height}
                    pointerEvents="none"
                    rx="7"
                    strokeWidth="2"
                    width={zone.width}
                    x={zone.x}
                    y={zone.y}
                  />
                  {selectedCount ? (
                    <g aria-hidden="true" pointerEvents="none">
                      <circle
                        cx={Math.min(zone.x + zone.width - 4, 624)}
                        cy={Math.max(zone.y + 4, 16)}
                        fill="#0f766e"
                        r="14"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="13"
                        fontWeight="700"
                        textAnchor="middle"
                        x={Math.min(zone.x + zone.width - 4, 624)}
                        y={Math.max(zone.y + 4, 16)}
                      >
                        {selectedCount}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          Les zones turquoise correspondent aux elements selectionnables.
        </p>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
            <MousePointer2 className="h-3.5 w-3.5" />
            Elements de cette vue
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(activeArea === "EXTERIOR" ? activeParts : interiorParts).map((part) => (
              <button
                className={[
                  "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700",
                  selectedPartCounts[part.id]
                    ? "border-teal-300 bg-teal-50 text-teal-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800",
                ].join(" ")}
                key={part.id}
                type="button"
                onClick={() => onSelect(part)}
              >
                <span>{part.name}</span>
                {selectedPartCounts[part.id] ? (
                  <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 px-1.5 text-xs font-semibold text-white">
                    {selectedPartCounts[part.id]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {activeArea === "EXTERIOR" ? (
          <div className="mt-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
            <CircleDot className="h-3.5 w-3.5" />
            Pneus et jantes
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {wheelCodes.map((code) => {
              const part = partsByCode.get(code);
              if (!part) return null;
              const selectedCount = selectedPartCounts[part.id] ?? 0;
              return (
                <Button
                  className={selectedCount ? "shrink-0 border-teal-300 bg-teal-50 text-teal-900" : "shrink-0"}
                  key={part.id}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => onSelect(part)}
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  {part.name}
                  {selectedCount ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-700 px-1 text-[11px] font-semibold text-white">
                      {selectedCount}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
              <PackageOpen className="h-3.5 w-3.5" />
              Accessoires
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {accessoryCodes.map((code) => {
                const part = partsByCode.get(code);
                if (!part) return null;
                const selectedCount = selectedPartCounts[part.id] ?? 0;
                return (
                  <Button
                    className={
                      selectedCount
                        ? "shrink-0 border-teal-300 bg-teal-50 text-teal-900"
                        : "shrink-0"
                    }
                    key={part.id}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => onSelect(part)}
                  >
                    <ListPlus className="h-3.5 w-3.5" />
                    {part.name}
                    {selectedCount ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-700 px-1 text-[11px] font-semibold text-white">
                        {selectedCount}
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getHitArea(zone: Zone) {
  const minimumWidth = 80;
  const minimumHeight = 72;
  const width = Math.max(zone.width, minimumWidth);
  const height = Math.max(zone.height, minimumHeight);

  return {
    x: Math.max(0, zone.x - (width - zone.width) / 2),
    y: Math.max(0, zone.y - (height - zone.height) / 2),
    width: Math.min(width, 640),
    height: Math.min(height, 320),
  };
}
