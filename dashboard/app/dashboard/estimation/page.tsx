"use client";

import { ArrowLeft, ArrowLeftRight, CarFront, Check, Info, Loader2, Paintbrush, Search, Wrench, X } from "lucide-react";
import { CSSProperties, FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import {
  GtmotiveEstimate,
  GtmotiveGraphicZone,
  GtmotiveNavigationBoard,
  GtmotiveOperationResult,
  GtmotivePart,
  GtmotivePartsResponse,
  GtmotiveVehicleIdentification,
} from "@/types/business";

type SearchMode = "registration" | "vin";
type GtmotiveOperationDefinition = {
  disabledReason?: string;
  description: string;
  id: number;
  implemented: boolean;
  label: string;
  switchFromTaskType?: number;
};
type GraphicZoneImage = NonNullable<GtmotiveGraphicZone["imgs"]>[number];
type GraphicPartChoice = {
  id: string;
  label: string;
  part: GtmotivePart | null;
};

const GTMOTIVE_OPERATION_DEFINITIONS: GtmotiveOperationDefinition[] = [
  {
    description: "Piece + main-d'oeuvre GT Motive",
    id: 1,
    implemented: true,
    label: "Remplacer",
  },
  {
    description: "Chiffrage de reparation avec details a renseigner",
    id: 2,
    implemented: false,
    label: "Reparer",
  },
  {
    description: "Main-d'oeuvre depose et repose",
    id: 3,
    implemented: true,
    label: "Deposer et poser",
  },
  {
    description: "Temps, montant MO et ingredients",
    id: 4,
    implemented: false,
    label: "Peindre",
  },
];

export default function EstimationPage() {
  const [mode, setMode] = useState<SearchMode>("registration");
  const [identifier, setIdentifier] = useState("");
  const [estimate, setEstimate] = useState<GtmotiveEstimate | null>(null);
  const [identification, setIdentification] = useState<GtmotiveVehicleIdentification | null>(null);
  const [navigationBoard, setNavigationBoard] = useState<GtmotiveNavigationBoard | null>(null);
  const [navigationSvg, setNavigationSvg] = useState<string | null>(null);
  const [navigationImageUrl, setNavigationImageUrl] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<{
    id: string;
    description: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredGraphicItem, setHoveredGraphicItem] = useState<{
    key: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);
  const [graphicPartSelector, setGraphicPartSelector] = useState<{
    key: string;
    label: string;
    options: GraphicPartChoice[];
    pinned: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; description: string } | null>(null);
  const [graphicZone, setGraphicZone] = useState<GtmotiveGraphicZone | null>(null);
  const graphicZoneViewportRef = useRef<HTMLDivElement | null>(null);
  const [graphicZoneViewport, setGraphicZoneViewport] = useState({ height: 640, width: 1033 });
  const [partsResponse, setPartsResponse] = useState<GtmotivePartsResponse | null>(null);
  const [selectedPart, setSelectedPart] = useState<GtmotivePart | null>(null);
  const [result, setResult] = useState<GtmotiveOperationResult | null>(null);
  const [addedOperationsByPart, setAddedOperationsByPart] = useState<Record<string, number[]>>({});
  const [activeTaskType, setActiveTaskType] = useState<number | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSelectingGroup, setIsSelectingGroup] = useState(false);

  const vehicleLabel = useMemo(() => {
    const vehicle = identification?.vehicle;
    if (!vehicle) return "Vehicule non identifie";
    return vehicle.label || [vehicle.make, vehicle.model, vehicle.version].filter(Boolean).join(" ") || "Vehicule detecte";
  }, [identification]);
  const canSelectGroup = Boolean(estimate?.estimateId && estimate.securityProfileId && identification?.ready);
  const navigationBackgroundImage = useMemo(() => {
    const images = navigationBoard?.images.filter((image) => image.url) ?? [];
    if (!images.length) return null;

    return images.reduce((closest, image) => {
      const closestDistance = Math.abs((closest.width ?? 0) - 1200);
      const imageDistance = Math.abs((image.width ?? 0) - 1200);
      return imageDistance < closestDistance ? image : closest;
    });
  }, [navigationBoard?.images]);
  const graphicZoneImages = useMemo(() => (graphicZone?.imgs ?? []).map((img, index) => prepareGraphicZoneImage(img, index)), [graphicZone?.imgs]);
  const graphicZoneLayout = useMemo(() => calculateGraphicZoneLayout(graphicZoneImages, graphicZoneViewport), [graphicZoneImages, graphicZoneViewport]);
  const selectedPartOperations = useMemo(
    () => getVisibleOperationDefinitions(selectedPart, result, selectedPart ? (addedOperationsByPart[selectedPart.id] ?? []) : []),
    [addedOperationsByPart, result, selectedPart],
  );

  useEffect(() => {
    const viewport = graphicZoneViewportRef.current;
    if (!viewport) return;

    const updateViewport = () => {
      const rect = viewport.getBoundingClientRect();
      setGraphicZoneViewport({
        height: Math.max(1, rect.height),
        width: Math.max(1, rect.width),
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [selectedGroup, graphicZone?.groupId]);

  useEffect(() => {
    let ignore = false;

    async function loadSvg() {
      if (!navigationBoard?.svgUrl) {
        console.debug("[GT Motive] SVG global non charge: svgUrl absent", {
          navigationBoard,
        });
        setNavigationSvg(null);
        return;
      }

      try {
        console.debug("[GT Motive] Chargement SVG global", {
          svgUrl: navigationBoard.svgUrl,
          boardId: navigationBoard.id,
        });
        const svg = await businessService.gtmotiveNavigationBoardSvg(navigationBoard.svgUrl);
        console.debug("[GT Motive] SVG global charge", {
          boardId: navigationBoard.id,
          length: svg.length,
          startsWithSvg: svg.trimStart().startsWith("<svg"),
        });
        if (!ignore) setNavigationSvg(svg);
      } catch (error) {
        console.error("[GT Motive] Echec chargement SVG global", {
          svgUrl: navigationBoard.svgUrl,
          error: normalizeError(error),
        });
        if (!ignore) setNavigationSvg(null);
      }
    }

    void loadSvg();
    return () => {
      ignore = true;
    };
  }, [navigationBoard?.svgUrl]);

  useEffect(() => {
    let ignore = false;
    let objectUrl: string | null = null;

    async function loadImage() {
      if (!navigationBackgroundImage?.url) {
        console.debug("[GT Motive] Image globale non chargee: imageUrl absent", {
          navigationBoard,
        });
        setNavigationImageUrl(null);
        return;
      }

      try {
        console.debug("[GT Motive] Chargement image globale", {
          imageUrl: navigationBackgroundImage.url,
          width: navigationBackgroundImage.width,
        });
        const image = await businessService.gtmotiveNavigationBoardImage(navigationBackgroundImage.url);
        objectUrl = URL.createObjectURL(image);
        console.debug("[GT Motive] Image globale chargee", {
          width: navigationBackgroundImage.width,
          size: image.size,
          type: image.type,
        });
        if (!ignore) setNavigationImageUrl(objectUrl);
      } catch (error) {
        console.error("[GT Motive] Echec chargement image globale", {
          imageUrl: navigationBackgroundImage.url,
          error: normalizeError(error),
        });
        if (!ignore) setNavigationImageUrl(null);
      }
    }

    void loadImage();
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [navigationBackgroundImage?.url, navigationBackgroundImage?.width]);

  async function identify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      toast.error("Saisir une immatriculation ou un VIN.");
      return;
    }

    setIsIdentifying(true);
    setEstimate(null);
    setIdentification(null);
    setNavigationBoard(null);
    setNavigationSvg(null);
    setNavigationImageUrl(null);
    setHoveredGroup(null);
    setHoveredGraphicItem(null);
    setGraphicPartSelector(null);
    setSelectedGroup(null);
    setGraphicZone(null);
    setPartsResponse(null);
    setSelectedPart(null);
    setResult(null);
    setAddedOperationsByPart({});
    setActiveTaskType(null);

    try {
      console.debug("[GT Motive] Creation estimation");
      const createdEstimate = await businessService.createGtmotiveEstimate();
      console.debug("[GT Motive] Estimation creee/chargee", {
        estimateId: createdEstimate.estimateId,
        securityProfileId: createdEstimate.securityProfileId,
        source: createdEstimate.source,
      });
      const vehicleIdentification = await businessService.identifyGtmotiveVehicle({
        estimateId: createdEstimate.estimateId,
        securityProfileId: createdEstimate.securityProfileId,
        registrationNumber: mode === "registration" ? cleanIdentifier : undefined,
        vin: mode === "vin" ? cleanIdentifier : undefined,
      });
      console.debug("[GT Motive] Vehicule identifie", {
        estimateId: vehicleIdentification.estimateId,
        securityProfileId: vehicleIdentification.securityProfileId,
        vehicle: vehicleIdentification.vehicle,
        warnings: vehicleIdentification.warnings,
      });
      const securityProfileId = vehicleIdentification.securityProfileId ?? createdEstimate.securityProfileId;
      console.debug("[GT Motive] Chargement navigation board", {
        estimateId: createdEstimate.estimateId,
        securityProfileId,
        makeCode: vehicleIdentification.vehicle.makeCode,
        modelId: vehicleIdentification.vehicle.modelId,
        navigationModelCode: vehicleIdentification.vehicle.navigationModelCode,
        equipment: vehicleIdentification.vehicle.equipment,
      });
      const board = await businessService.gtmotiveNavigationBoard(createdEstimate.estimateId, {
        securityProfileId,
        makeCode: vehicleIdentification.vehicle.makeCode,
        modelId: vehicleIdentification.vehicle.modelId,
        navigationModelCode: vehicleIdentification.vehicle.navigationModelCode,
        equipment: vehicleIdentification.vehicle.equipment,
      });
      console.debug("[GT Motive] Navigation board recue", {
        id: board.id,
        svgUrl: board.svgUrl,
        imagesCount: board.images.length,
        groupsCount: board.functionalGroups.length,
        fallback: board.fallback,
        message: board.message,
      });

      setEstimate({
        ...createdEstimate,
        securityProfileId,
      });
      setIdentification(vehicleIdentification);
      setNavigationBoard(board);
      toast.success("Estimation GT Motive prete.");
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error("[GT Motive] Echec preparation estimation", normalizedError);
      toast.error(getErrorMessage(normalizedError, "Impossible de preparer l'estimation GT Motive."));
    } finally {
      setIsIdentifying(false);
    }
  }

  async function selectGroup(group: { id: string; description: string }) {
    if (!estimate) return;
    if (!canSelectGroup) {
      toast.error("Vehicule non identifie dans GT Motive. Relance l'identification avant de selectionner une piece.");
      return;
    }

    setIsSelectingGroup(true);
    setSelectedGroup(group);
    setGraphicZone(null);
    setHoveredGraphicItem(null);
    setGraphicPartSelector(null);
    setPartsResponse(null);
    setSelectedPart(null);
    setResult(null);
    setActiveTaskType(null);

    try {
      console.debug("[GT Motive] Selection groupe", {
        estimateId: estimate.estimateId,
        securityProfileId: estimate.securityProfileId,
        group,
      });
      await businessService.selectGtmotiveGroup(estimate.estimateId, {
        groupId: group.id,
        securityProfileId: estimate.securityProfileId,
      });
      const [parts, zone] = await Promise.all([
        businessService.gtmotiveParts(estimate.estimateId, estimate.securityProfileId, group.id),
        businessService.gtmotiveGraphicZone(estimate.estimateId, group.id, {
          securityProfileId: estimate.securityProfileId,
          makeCode: identification?.vehicle.makeCode,
          modelId: identification?.vehicle.modelId,
          navigationModelCode: identification?.vehicle.navigationModelCode,
          equipment: identification?.vehicle.equipment,
        }),
      ]);
      console.debug("[GT Motive] Groupe charge", {
        group,
        partsCount: parts.parts.length,
        graphicZoneAvailable: zone.available,
        graphicZoneMessage: zone.message,
      });
      setPartsResponse(parts);
      setGraphicZone(zone);
    } catch (error) {
      console.error("[GT Motive] Echec selection groupe", {
        group,
        error: normalizeError(error),
      });
      toast.error("Impossible de selectionner ce groupe GT Motive.");
    } finally {
      setIsSelectingGroup(false);
    }
  }

  function handleNavigationBoardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    const zone = target.closest("[id^='z']");
    const groupId = zone?.id.replace(/^z/, "");
    const group = navigationBoard?.functionalGroups.find((item) => item.id === groupId);

    console.debug("[GT Motive] Clic SVG global", {
      clickedElementId: zone?.id,
      resolvedGroupId: groupId,
      foundGroup: group,
    });

    if (group) {
      void selectGroup(group);
    }
  }

  function handleNavigationBoardMove(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    const zone = target.closest("[id^='z']");
    const groupId = zone?.id.replace(/^z/, "");
    const group = navigationBoard?.functionalGroups.find((item) => item.id === groupId);

    if (!group) {
      if (hoveredGroup) setHoveredGroup(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredGroup({
      id: group.id,
      description: group.description,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  async function addSelectedOperation(operation: GtmotiveOperationDefinition) {
    if (!estimate || !selectedPart) return;

    if (!operation.implemented) {
      toast(`Le detail ${operation.label.toLowerCase()} GT Motive necessite encore le flux de saisie dedie.`);
      return;
    }

    if (operation.disabledReason) {
      toast(operation.disabledReason);
      return;
    }

    const task = selectedPart.operations.find((item) => item.id === operation.id && item.available);
    if (!task) {
      toast.error(`Operation ${operation.label.toLowerCase()} indisponible pour cette piece.`);
      return;
    }

    setActiveTaskType(operation.id);
    setResult(null);
    try {
      console.debug("[GT Motive] Enregistrement operation", {
        estimateId: estimate.estimateId,
        operation,
        part: selectedPart,
      });
      const operationResult = await businessService.switchGtmotivePartOperation(estimate.estimateId, selectedPart, {
        securityProfileId: estimate.securityProfileId,
        taskType: operation.id,
      });
      console.debug("[GT Motive] Resultat operation", operationResult);
      setResult(operationResult);
      setAddedOperationsByPart((current) => ({
        ...current,
        [operationResult.part.id]: uniqueNumbers([
          ...(current[operationResult.part.id] ?? []).filter((taskType) => !areOperationsIncompatible(operationResult.actionId, taskType)),
          operationResult.actionId,
        ]),
      }));
      toast.success(
        operationResult.replacedOperation
          ? `Operation ${operationResult.replacedOperation.operation.toLowerCase()} remplacee par ${operationResult.operation.toLowerCase()}.`
          : `Operation ${operationResult.operation.toLowerCase()} ajoutee.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error("[GT Motive] Echec operation", {
        operation,
        part: selectedPart,
        error: normalizedError,
      });
      toast.error(getErrorMessage(normalizedError, `Impossible d'enregistrer l'operation ${operation.label.toLowerCase()}.`));
    } finally {
      setActiveTaskType(null);
    }
  }

  function handleGraphicItemMove(event: MouseEvent<HTMLDivElement>, image: ReturnType<typeof prepareGraphicZoneImage>) {
    if (!isGraphicPaintTarget(event.target)) {
      if (hoveredGraphicItem) setHoveredGraphicItem(null);
      return;
    }

    const tooltipPosition = graphicOverlayPosition(event, 260, 54);
    setHoveredGraphicItem({
      key: image.key,
      label: image.label,
      x: tooltipPosition.x,
      y: tooltipPosition.y,
    });

    const choices = graphicPartChoicesForImage(image, partsResponse?.parts ?? []);
    if (choices.length > 1 && graphicPartSelector?.key !== image.key && !graphicPartSelector?.pinned) {
      const selectorPosition = graphicOverlayPosition(event, 200, Math.min(240, 52 + choices.length * 36), "below");
      setGraphicPartSelector({
        key: image.key,
        label: image.label,
        options: choices,
        pinned: false,
        x: selectorPosition.x,
        y: selectorPosition.y,
      });
    } else if (choices.length <= 1 && graphicPartSelector && !graphicPartSelector.pinned) {
      setGraphicPartSelector(null);
    }
  }

  function handleGraphicZoneMove(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    if (target.closest("[data-gtmotive-part-selector='true']")) {
      return;
    }

    if (isGraphicPaintTarget(target)) {
      return;
    }

    if (hoveredGraphicItem) setHoveredGraphicItem(null);
  }

  function handleGraphicZoneClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    if (target.closest("[data-gtmotive-part-selector='true']") || isGraphicPaintTarget(target)) {
      return;
    }

    setGraphicPartSelector(null);
  }

  function selectGraphicItem(event: MouseEvent<HTMLDivElement>, image: ReturnType<typeof prepareGraphicZoneImage>) {
    event.stopPropagation();
    if (!isGraphicPaintTarget(event.target)) return;

    const choices = graphicPartChoicesForImage(image, partsResponse?.parts ?? []);
    if (choices.length > 1) {
      const menuHeight = Math.min(240, 52 + choices.length * 36);
      const selectorPosition = graphicOverlayPosition(event, 200, menuHeight, "below");

      console.debug("[GT Motive] Choix lateralite piece graphique", {
        imageId: image.id,
        label: image.label,
        choices,
      });
      setGraphicPartSelector({
        key: image.key,
        label: image.label,
        options: choices,
        pinned: true,
        x: selectorPosition.x,
        y: selectorPosition.y,
      });
      return;
    }

    const part = choices[0]?.part ?? findPartForGraphicImage(image, partsResponse?.parts ?? []);
    console.debug("[GT Motive] Clic piece graphique", {
      imageId: image.id,
      label: image.label,
      partIds: image.partIds,
      resolvedPart: part,
    });

    if (part) {
      setSelectedPart(part);
      setResult(null);
      setActiveTaskType(null);
      setGraphicPartSelector(null);
      toast.success(`Piece selectionnee : ${part.label}`);
      return;
    }

    toast.error("Piece non retrouvee dans la liste GT Motive.");
  }

  function selectGraphicPartChoice(choice: GraphicPartChoice) {
    console.debug("[GT Motive] Selection lateralite piece", choice);

    if (!choice.part) {
      toast.error("Piece non retrouvee dans la liste GT Motive.");
      return;
    }

    setSelectedPart(choice.part);
    setResult(null);
    setActiveTaskType(null);
    setGraphicPartSelector(null);
    toast.success(`Piece selectionnee : ${choice.part.label}`);
  }

  return (
    <>
      <PageHeader
        title="Estimation"
        description="Vérifiez rapidement les prix des pièces constructeur et les temps de main-d’œuvre afin de contrôler un devis ou une estimation de réparation. Identifiez un véhicule pour consulter les données disponibles. Tous les constructeurs ne sont pas encore référencés."
      />

      <div className="mx-auto max-w-[1480px] space-y-5">
        <Card>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(320px,420px)_1fr]">
            <form className="space-y-4" onSubmit={(event) => void identify(event)}>
              <div className="grid grid-cols-2 rounded-md border border-gray-200 bg-gray-50 p-1">
                <button
                  className={cn("h-9 rounded-sm text-sm font-medium text-gray-600 transition-colors", mode === "registration" && "bg-white text-teal-800 shadow-sm")}
                  type="button"
                  onClick={() => setMode("registration")}
                >
                  Immatriculation
                </button>
                <button
                  className={cn("h-9 rounded-sm text-sm font-medium text-gray-600 transition-colors", mode === "vin" && "bg-white text-teal-800 shadow-sm")}
                  type="button"
                  onClick={() => setMode("vin")}
                >
                  VIN
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="gtmotive-identifier">{mode === "registration" ? "Immatriculation" : "VIN"}</Label>
                  <Input
                    autoComplete="off"
                    className="uppercase"
                    id="gtmotive-identifier"
                    placeholder={mode === "registration" ? "AB-123-CD" : "VF1XXXXXXXXXXXXXX"}
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value.toUpperCase())}
                  />
                </div>
                <Button className="self-end" disabled={isIdentifying} type="submit">
                  {isIdentifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Identifier
                </Button>
              </div>
            </form>

            <div className="flex min-w-0 flex-col justify-center gap-3 rounded-md border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                  <CarFront className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-950">{vehicleLabel}</p>
                  <p className="mt-1 break-words text-sm text-gray-500">
                    {identification?.vehicle.registrationNumber || "Plaque inconnue"}
                    {identification?.vehicle.vin ? ` - ${identification.vehicle.vin}` : ""}
                  </p>
                </div>
              </div>

              {estimate ? (
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">Estimation {estimate.code || estimate.estimateId}</Badge>
                  <Badge variant="outline">{estimate.source === "fallback" ? "Chargee" : "Creee"}</Badge>
                </div>
              ) : null}

              {identification?.warnings.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{identification.warnings[0]}</div>
              ) : null}

              {identification && !canSelectGroup ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  Vehicule non identifie dans GT Motive. Relance l'identification avant de selectionner une piece.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>{selectedGroup ? selectedGroup.description : "Vue globale"}</CardTitle>
              <CardDescription>
                {selectedGroup ? "Selectionner une piece directement dans la vue eclatee." : "Selectionner une zone du vehicule pour charger les pieces."}
              </CardDescription>
            </div>
            {selectedGroup ? (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedGroup(null);
                  setGraphicZone(null);
                  setPartsResponse(null);
                  setSelectedPart(null);
                  setResult(null);
                  setActiveTaskType(null);
                  setHoveredGraphicItem(null);
                  setGraphicPartSelector(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Vue globale
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {navigationBoard?.message ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{navigationBoard.message}</div> : null}

            {!selectedGroup ? (
              navigationSvg ? (
                <div
                  aria-label="Vue globale GT Motive"
                  className="gtmotive-navigation-board relative h-[clamp(320px,48vw,620px)] max-w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50 p-3 [contain:layout_paint]"
                  onClick={handleNavigationBoardClick}
                  onMouseLeave={() => setHoveredGroup(null)}
                  onMouseMove={handleNavigationBoardMove}
                >
                  <style jsx>{`
                    .gtmotive-navigation-board :global(svg g[id^="z"] *) {
                      cursor: pointer;
                      pointer-events: all;
                      transition:
                        fill 120ms ease,
                        stroke 120ms ease,
                        stroke-width 120ms ease;
                    }

                    .gtmotive-navigation-board :global(svg g[id^="z"]:hover *) {
                      fill: rgba(20, 184, 166, 0.26) !important;
                      stroke: rgb(13, 148, 136) !important;
                      stroke-width: 2.5px !important;
                    }
                  `}</style>
                  <div className="relative mx-auto h-full max-h-full aspect-[1200/730] max-w-full">
                    {navigationImageUrl ? (
                      <img alt="" className="absolute inset-0 h-full w-full object-contain" src={navigationImageUrl} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Image de fond GT Motive en chargement.</div>
                    )}
                    <div
                      className="absolute inset-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible"
                      dangerouslySetInnerHTML={{ __html: navigationSvg }}
                    />
                  </div>
                  {hoveredGroup ? (
                    <div
                      className="pointer-events-none absolute z-10 max-w-[240px] rounded-md border border-teal-200 bg-white/95 px-3 py-2 text-xs font-medium text-teal-950 shadow-sm"
                      style={{
                        left: hoveredGroup.x + 14,
                        top: Math.max(hoveredGroup.y - 38, 8),
                      }}
                    >
                      {hoveredGroup.description}
                    </div>
                  ) : null}
                  {isSelectingGroup ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-teal-900">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement de la vue eclatee
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {navigationBoard ? "Vue globale indisponible pour ce vehicule." : "Identifier un vehicule pour charger la vue globale."}
                </div>
              )
            ) : null}

            {selectedGroup ? (
              graphicZone ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-950">Vue eclatee du groupe</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {graphicZone.available
                          ? `${graphicZone.imgs?.length ?? 0} elements graphiques GT Motive charges.`
                          : graphicZone.message || "Vue detaillee indisponible pour ce groupe."}
                      </p>
                    </div>
                    {graphicZone.metadata?.navigationModelCode ? <Badge variant="outline">{graphicZone.metadata.navigationModelCode}</Badge> : null}
                  </div>

                  {graphicZone.available && graphicZone.imgs?.length ? (
                    <div
                      className="gtmotive-exploded-view relative h-[min(72vh,760px)] min-h-[520px] max-w-full overflow-hidden rounded-md border border-gray-200 bg-white"
                      onClick={handleGraphicZoneClick}
                      onMouseMove={handleGraphicZoneMove}
                      onMouseLeave={() => {
                        setHoveredGraphicItem(null);
                        setGraphicPartSelector(null);
                      }}
                      ref={graphicZoneViewportRef}
                    >
                      <style jsx>{`
                        .gtmotive-exploded-view :global(svg:not(:root)) {
                          overflow: visible;
                        }

                        .gtmotive-exploded-view :global(.gtmotive-graphic-item) {
                          pointer-events: none;
                        }

                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg) {
                          pointer-events: none;
                        }

                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg path),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg circle),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg ellipse),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg polygon),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg polyline),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg rect),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg line),
                        .gtmotive-exploded-view :global(.gtmotive-graphic-item svg use) {
                          cursor: pointer;
                          pointer-events: visiblePainted;
                        }

                        .gtmotive-exploded-view :global(svg circle),
                        .gtmotive-exploded-view :global(svg ellipse),
                        .gtmotive-exploded-view :global(svg g),
                        .gtmotive-exploded-view :global(svg path) {
                          stroke: #777;
                          stroke-width: 0.6px !important;
                          vector-effect: non-scaling-stroke;
                        }

                        .gtmotive-exploded-view :global(.graphic-hover svg) {
                          filter: drop-shadow(0 0 5px rgba(15, 118, 110, 0.45));
                        }

                        .gtmotive-exploded-view :global(.graphic-hover svg circle),
                        .gtmotive-exploded-view :global(.graphic-hover svg ellipse),
                        .gtmotive-exploded-view :global(.graphic-hover svg g),
                        .gtmotive-exploded-view :global(.graphic-hover svg path) {
                          stroke: #0f766e;
                          stroke-width: 1.4px !important;
                        }

                        .gtmotive-exploded-view :global(.disabled) {
                          opacity: 0.25;
                        }
                      `}</style>
                      <div
                        className="absolute left-0 top-0"
                        style={{
                          height: 0,
                          transform: `translate(${graphicZoneLayout.offsetX}px, ${graphicZoneLayout.offsetY}px) scale(${graphicZoneLayout.scale})`,
                          transformOrigin: "top left",
                          width: graphicZoneViewport.width,
                        }}
                      >
                        {graphicZoneImages.map((img, index) => (
                          <div
                            className={cn(
                              "gtmotive-graphic-item absolute cursor-pointer transition-opacity hover:opacity-80",
                              img.className,
                              (hoveredGraphicItem?.key === img.key || graphicPartSelector?.key === img.key) && "graphic-hover",
                            )}
                            data-gtmotive-part-count={img.partOptions.length}
                            data-gtmotive-part-label={img.label}
                            key={`${img.id ?? "graphic"}-${index}`}
                            style={img.style}
                            onClick={(event) => selectGraphicItem(event, img)}
                            onMouseMove={(event) => handleGraphicItemMove(event, img)}
                            dangerouslySetInnerHTML={{ __html: img.html }}
                          />
                        ))}
                      </div>
                      {hoveredGraphicItem ? (
                        <div
                          className="pointer-events-none absolute z-[999999] max-w-[260px] rounded-md border border-teal-200 bg-white px-3 py-2 text-xs font-medium text-teal-950 shadow-lg"
                          style={{
                            left: hoveredGraphicItem.x,
                            top: hoveredGraphicItem.y,
                          }}
                        >
                          {hoveredGraphicItem.label}
                        </div>
                      ) : null}
                      {graphicPartSelector ? (
                        <div
                          className="absolute z-[1000000] w-[220px] overflow-hidden rounded-md border border-teal-200 bg-white text-sm shadow-xl"
                          data-gtmotive-part-selector="true"
                          style={{
                            left: graphicPartSelector.x,
                            top: graphicPartSelector.y,
                          }}
                        >
                          <div className="border-b border-gray-100 bg-teal-50 px-3 py-2">
                            <p className="truncate text-xs font-semibold text-teal-950">{graphicPartSelector.label}</p>
                          </div>
                          <div className="max-h-[180px] overflow-auto py-1">
                            {graphicPartSelector.options.map((choice) => (
                              <button
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-gray-800 transition-colors hover:bg-teal-50 hover:text-teal-900 disabled:cursor-not-allowed disabled:text-gray-400"
                                disabled={!choice.part}
                                key={choice.id}
                                type="button"
                                onClick={() => selectGraphicPartChoice(choice)}
                              >
                                <span className="min-w-0 truncate">{choice.label}</span>
                                {choice.part ? <Check className="h-4 w-4 shrink-0 text-teal-700" /> : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {isSelectingGroup ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement de la vue eclatee
                    </>
                  ) : (
                    "Vue eclatee indisponible pour ce groupe."
                  )}
                </div>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>

      {selectedPart ? (
        <div className="fixed inset-0 z-50 bg-black/10">
          <aside className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Piece selectionnee</p>
                <h2 className="mt-1 break-words text-lg font-semibold text-gray-950">{selectedPart.label}</h2>
                <p className="mt-1 font-mono text-xs text-gray-500">{selectedPart.id}</p>
              </div>
              <Button
                aria-label="Fermer"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedPart(null);
                  setResult(null);
                  setActiveTaskType(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-auto p-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-gray-500">Operations disponibles</p>
                <div className="grid gap-2">
                  {selectedPartOperations.length ? (
                    selectedPartOperations.map((operation) => {
                      const isActive = activeTaskType === operation.id;
                      const Icon = operationIcon(operation.id);
                      const disabledReason = operation.disabledReason;

                      return (
                        <Button
                          className="h-auto justify-start gap-3 px-3 py-3 text-left"
                          disabled={!estimate || Boolean(activeTaskType) || !operation.implemented || Boolean(disabledReason)}
                          key={operation.id}
                          type="button"
                          variant="outline"
                          onClick={() => void addSelectedOperation(operation)}
                        >
                          {isActive ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Icon className="h-4 w-4 shrink-0" />}
                          <span className="min-w-0">
                            <span className="block font-medium">{operation.label}</span>
                            <span className="block text-xs font-normal text-gray-500">{disabledReason ?? operation.description}</span>
                          </span>
                        </Button>
                      );
                    })
                  ) : (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">Aucune operation GT Motive disponible pour cette piece.</div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Metric info="Reference technique retournee par GT Motive pour la piece ajoutee a l'estimation." label="Reference" value={result?.reference || "-"} />
                <Metric
                  info="Montant de la piece calcule par GT Motive pour l'operation selectionnee, hors main-d'oeuvre."
                  label="Prix piece"
                  value={formatCurrency(result?.partPrice)}
                />
                <Metric info="Temps de main-d'oeuvre associe a l'operation selectionnee." label="Temps MO" value={formatLabour(result?.labourTime)} />
                <Metric
                  info="Tarif horaire applique par GT Motive pour transformer le temps MO en montant."
                  label="Taux MO"
                  value={formatLabourRate(result?.labourRate, result?.labourRateLabel)}
                />
                <Metric
                  info="Montant de main-d'oeuvre calcule par GT Motive a partir du temps MO et du taux applique."
                  label="Montant MO"
                  value={formatCurrency(result?.labourAmount)}
                />
                <Metric
                  info="Cout des ingredients ou consommables lies a l'operation, surtout pour la peinture. '-' si GT Motive ne fournit pas de montant."
                  label="Ingredients"
                  value={formatCurrency(result?.ingredientsAmount)}
                />
                <Metric
                  info="Somme des montants disponibles pour cette operation : piece, main-d'oeuvre et ingredients."
                  label="Total"
                  strong
                  value={formatCurrency(result?.total)}
                />
                <Metric info="Reference constructeur d'origine renvoyee par GT Motive, quand elle est disponible." label="OEM" value={result?.oemReference || "-"} />
              </div>

              {result ? (
                <div className="space-y-3 rounded-md border border-teal-200 bg-teal-50 p-4">
                  <p className="text-sm font-medium text-teal-950">
                    {vehicleLabel} - {result.part.label}
                  </p>
                  <p className="mt-1 text-sm text-teal-800">
                    {result.replacedOperation
                      ? `Operation ${result.replacedOperation.operation.toLowerCase()} remplacee par ${result.operation.toLowerCase()} dans l'estimation GT Motive.`
                      : `Operation ${result.operation.toLowerCase()} ajoutee a l'estimation GT Motive.`}
                  </p>
                  {result.precalculation ? <p className="rounded-md bg-white/70 px-3 py-2 font-mono text-xs text-teal-900">{result.precalculation}</p> : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Metric({ info, label, value, strong = false }: { info?: string; label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5">
        <p className="text-xs uppercase text-gray-500">{label}</p>
        {info ? <MetricInfo content={info} /> : null}
      </div>
      <p className={cn("mt-1 break-words text-lg font-semibold text-gray-950", strong && "text-teal-800")}>{value}</p>
    </div>
  );
}

function MetricInfo({ content }: { content: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        aria-label={content}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        title={content}
        type="button"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        className="pointer-events-none absolute bottom-full left-0 z-[60] mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-xs normal-case leading-relaxed text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatLabour(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} h`;
}

function formatLabourRate(value?: number | null, fallback?: string | null) {
  if (value !== null && value !== undefined) {
    return `${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)}/h`;
  }
  return fallback || "-";
}

function getVisibleOperationDefinitions(part: GtmotivePart | null, result: GtmotiveOperationResult | null, addedOperationIds: number[]) {
  if (!part) return [];
  return GTMOTIVE_OPERATION_DEFINITIONS.filter((definition) => part.operations.some((operation) => operation.id === definition.id && operation.available)).map(
    (definition) => {
      const operation = part.operations.find((item) => item.id === definition.id);
      const isSameResultPart = result?.part.id === part.id;
      const existingTaskTypes = uniqueNumbers([...addedOperationIds, ...(isSameResultPart && result ? [result.actionId] : [])]);
      const isAlreadyAdded = existingTaskTypes.includes(definition.id);
      const incompatibleTaskType = existingTaskTypes.find((taskType) => areOperationsIncompatible(definition.id, taskType));
      const incompatibleOperation = GTMOTIVE_OPERATION_DEFINITIONS.find((item) => item.id === incompatibleTaskType);
      const description = isAlreadyAdded
        ? "Operation deja ajoutee. Cliquer pour relire le resultat GT Motive."
        : incompatibleTaskType
          ? `Remplace l'operation ${incompatibleOperation?.label.toLowerCase() ?? "deja ajoutee"} sur cette piece.`
          : operation?.label && operation.label !== definition.label
            ? operation.label
            : definition.description;

      return {
        ...definition,
        description: definition.implemented ? description : `Flux details ${definition.label.toLowerCase()} a brancher`,
        disabledReason: undefined,
        label: operation?.label || definition.label,
        switchFromTaskType: incompatibleTaskType,
      };
    },
  );
}

function areOperationsIncompatible(nextTaskType: number, existingTaskType: number) {
  return (nextTaskType === 1 && existingTaskType === 3) || (nextTaskType === 3 && existingTaskType === 1);
}

function operationIcon(taskType: number) {
  if (taskType === 3) return ArrowLeftRight;
  if (taskType === 4) return Paintbrush;
  return Wrench;
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

function isGraphicPaintTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      ".gtmotive-graphic-item path, .gtmotive-graphic-item circle, .gtmotive-graphic-item ellipse, .gtmotive-graphic-item polygon, .gtmotive-graphic-item polyline, .gtmotive-graphic-item rect, .gtmotive-graphic-item line, .gtmotive-graphic-item use",
    ),
  );
}

function graphicOverlayPosition(event: MouseEvent<HTMLDivElement>, width: number, height: number, placement: "above" | "below" = "above") {
  const container = event.currentTarget.closest(".gtmotive-exploded-view");
  const rect = container?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  return {
    x: Math.max(12, Math.min(mouseX + 14, rect.width - width - 12)),
    y: Math.max(12, Math.min(placement === "below" ? mouseY + 12 : mouseY - height + 20, rect.height - height - 12)),
  };
}

function calculateGraphicZoneLayout(images: ReturnType<typeof prepareGraphicZoneImage>[], viewport: { height: number; width: number }) {
  if (!images.length) {
    return {
      offsetX: 24,
      offsetY: 24,
      scale: 1,
    };
  }

  const minX = Math.min(...images.map((image) => image.bounds.minX));
  const minY = Math.min(...images.map((image) => image.bounds.minY));
  const maxX = Math.max(...images.map((image) => image.bounds.maxX));
  const maxY = Math.max(...images.map((image) => image.bounds.maxY));
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const scale = Math.min(2.35, Math.max(0.2, Math.min((viewport.width * 0.96) / contentWidth, (viewport.height * 0.92) / contentHeight)));

  return {
    offsetX: (viewport.width - contentWidth * scale) / 2 - minX * scale,
    offsetY: (viewport.height - contentHeight * scale) / 2 - minY * scale,
    scale,
  };
}

function prepareGraphicZoneImage(img: GraphicZoneImage, index: number) {
  const svgImage = img.svgImage ?? "";
  const viewBox = parseSvgViewBox(svgImage);
  const gradientId = `gtmotive-grad-${img.id ?? index}`;
  const [firstColor, secondColor] = graphicGradientColors(img);
  const gradientDefinition = `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="1"><stop offset="30%" stop-color="${firstColor}"/><stop offset="70%" stop-color="${secondColor}"/></linearGradient>`;
  const html = injectSvgDefinitions(svgImage, gradientDefinition)
    .replaceAll("{{grad_id}}", gradientId)
    .replaceAll("{{offset_1}}", "30%")
    .replaceAll("{{stop_color_1}}", firstColor)
    .replaceAll("{{offset_2}}", "70%")
    .replaceAll("{{stop_color_2}}", secondColor);
  const positionX = img.positionX ?? 0;
  const positionY = img.positionY ?? 0;
  const scale = img.scale ?? 1;
  const rotation = img.rotation ?? 0;
  const translateX = positionX + viewBox.minX;
  const translateY = viewBox.minY - positionY;
  const order = img.order ?? index;
  const disabled = String(img.state ?? "")
    .toLowerCase()
    .includes("disabled");
  const bounds = calculateTransformedBounds({
    height: viewBox.height,
    originX: positionX,
    originY: positionY * -1,
    rotation,
    scale,
    translateX,
    translateY,
    width: viewBox.width,
  });

  return {
    bounds,
    id: img.id,
    key: String(img.id ?? index),
    className: disabled ? "disabled" : "not-selected",
    html,
    label: graphicImageLabel(img, index),
    partIds: graphicImagePartIds(img),
    partOptions: graphicImagePartOptions(img),
    style: {
      fill: `url(#${gradientId})`,
      height: viewBox.height,
      opacity: disabled ? 0.25 : 1,
      transform: `scale(${scale}) rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`,
      transformOrigin: `${positionX}px ${positionY * -1}px`,
      width: viewBox.width,
      zIndex: order === 1 ? "auto" : order * 1000,
    } satisfies CSSProperties,
  };
}

function graphicImagePartOptions(img: GraphicZoneImage) {
  return graphicImagePartObjects(img).map((part, index) => {
    const id = readString(part, ["partCode", "code", "id", "cupi"]) || `${img.id ?? "part"}-${index}`;
    const description = readString(part, ["description", "label", "name", "partDescription"]) || `Piece ${id}`;
    return {
      id,
      label: description,
      partNumber: readString(part, ["reference", "partNumber"]),
    };
  });
}

function graphicImageLabel(img: GraphicZoneImage, index: number) {
  const parts = graphicImagePartObjects(img);
  const firstPart = parts[0];
  const description = readString(firstPart, ["description", "label", "name", "partDescription"]);
  const code = readString(firstPart, ["partCode", "code", "id", "cupi"]);

  if (description && code) return `${description} (${code})`;
  if (description) return description;
  if (code) return `Piece ${code}`;
  return img.id ? `Element graphique ${img.id}` : `Element graphique ${index + 1}`;
}

function graphicImagePartIds(img: GraphicZoneImage) {
  return uniqueStrings(
    graphicImagePartObjects(img).flatMap((part) => [readString(part, ["partCode", "code", "id", "cupi"]), readString(part, ["reference", "partNumber"])]),
  );
}

function graphicImagePartObjects(img: GraphicZoneImage): Record<string, unknown>[] {
  if (!Array.isArray(img.parts)) return [];
  return img.parts.filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object");
}

function graphicPartChoicesForImage(image: ReturnType<typeof prepareGraphicZoneImage>, parts: GtmotivePart[]) {
  if (!image.partOptions.length) {
    const part = findPartForGraphicImage(image, parts);
    return part ? [{ id: part.id, label: part.label, part }] : [];
  }

  return image.partOptions.map((option) => {
    const part = findMatchingPart(option, parts);
    return {
      id: option.id,
      label: option.label,
      part,
    };
  });
}

function findPartForGraphicImage(image: ReturnType<typeof prepareGraphicZoneImage>, parts: GtmotivePart[]) {
  const imageIds = image.partIds.map(normalizePartKey).filter(Boolean);
  if (!imageIds.length) return null;

  return (
    parts.find((part) => imageIds.includes(normalizePartKey(part.id))) ??
    parts.find((part) => part.partNumber && imageIds.includes(normalizePartKey(part.partNumber))) ??
    null
  );
}

function findMatchingPart(option: { id: string; label: string; partNumber?: string }, parts: GtmotivePart[]) {
  const optionId = normalizePartKey(option.id);
  const optionPartNumber = normalizePartKey(option.partNumber);
  const optionLabel = normalizePartKey(option.label);

  if (optionId) {
    const byId = parts.find((part) => normalizePartKey(part.id) === optionId);
    if (byId) return byId;
  }

  if (optionPartNumber) {
    const byPartNumber = parts.find((part) => normalizePartKey(part.partNumber) === optionPartNumber);
    if (byPartNumber) return byPartNumber;
  }

  if (optionLabel) {
    const byLabel = parts.find((part) => normalizePartKey(part.label) === optionLabel);
    if (byLabel) return byLabel;
  }

  return null;
}

function readString(value: Record<string, unknown> | undefined, keys: string[]) {
  if (!value) return "";
  for (const key of keys) {
    const current = value[key];
    if (typeof current === "string" && current.trim()) return current.trim();
    if (typeof current === "number" && Number.isFinite(current)) return String(current);
  }
  return "";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizePartKey(value?: string) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""
  );
}

function injectSvgDefinitions(svgImage: string, definitions: string) {
  if (!svgImage.includes("<svg")) return svgImage;
  if (svgImage.includes("<defs")) return svgImage.replace(/<defs[^>]*>/i, (match) => `${match}${definitions}`);
  return svgImage.replace(/(<svg\b[^>]*>)/i, `$1<defs>${definitions}</defs>`);
}

function calculateTransformedBounds({
  height,
  originX,
  originY,
  rotation,
  scale,
  translateX,
  translateY,
  width,
}: {
  height: number;
  originX: number;
  originY: number;
  rotation: number;
  scale: number;
  translateX: number;
  translateY: number;
  width: number;
}) {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => {
    const translatedX = x - originX + translateX;
    const translatedY = y - originY + translateY;
    return {
      x: originX + (translatedX * cos - translatedY * sin) * scale,
      y: originY + (translatedX * sin + translatedY * cos) * scale,
    };
  });

  return {
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
  };
}

function parseSvgViewBox(svgImage: string) {
  const match = /viewBox=['"]([^'"]+)['"]/i.exec(svgImage);
  const [minX = 0, minY = 0, width = 80, height = 80] = match?.[1].split(/\s+/).map((value) => Number.parseFloat(value)) ?? [];

  return {
    height: Number.isFinite(height) ? Number(height.toFixed(3)) : 80,
    minX: Number.isFinite(minX) ? Number(minX.toFixed(3)) : 0,
    minY: Number.isFinite(minY) ? Number(minY.toFixed(3)) : 0,
    width: Number.isFinite(width) ? Number(width.toFixed(3)) : 80,
  };
}

function graphicGradientColors(img: GraphicZoneImage): [string, string] {
  if (typeof img.gradient === "string" && img.gradient.trim()) {
    const colors = img.gradient
      .split(",")
      .map((color) => normalizeGtColor(color))
      .filter(Boolean);
    if (colors[0] && colors[1]) return [colors[0], colors[1]];
    if (colors[0]) return [colors[0], colors[0]];
  }

  return ["#f7f7f7", "#d7d7d7"];
}

function normalizeGtColor(color: string) {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.startsWith("0x")) return `#${trimmed.slice(2)}`;
  if (trimmed.startsWith("#")) return trimmed;
  return trimmed;
}

function normalizeError(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    return {
      message: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return error;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string; context?: { reason?: string }; nextStep?: string } }).data;
    if (data?.context?.reason === "VIN absent avant VIN Query.") {
      return "GT Motive n'a pas retourne de VIN pour cette immatriculation. Bascule en mode VIN pour continuer.";
    }
    if (data?.message) return data.message;
    if (data?.nextStep) return data.nextStep;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }

  return fallback;
}
