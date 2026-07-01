"use client";

import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Euro,
  FileSearch,
  ListChecks,
  PackageCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExportButton } from "@/components/business/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { DashboardSummary, DashboardTimelinePoint, VehicleCheck } from "@/types/business";

type CollaboratorSaving = {
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string | null;
  totalInternalSavingAmount: string;
  vehicleChecksCount: number;
};

type KpiTone = "blue" | "teal" | "emerald" | "red" | "amber" | "slate";
type KpiTrend = {
  className: string;
  label: string;
};

const toneStyles: Record<KpiTone, { chart: string; icon: string }> = {
  amber: {
    chart: "#f59e0b",
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  blue: {
    chart: "#2563eb",
    icon: "bg-blue-50 text-blue-600 ring-blue-100",
  },
  emerald: {
    chart: "#10b981",
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  red: {
    chart: "#ef4444",
    icon: "bg-red-50 text-red-600 ring-red-100",
  },
  slate: {
    chart: "#64748b",
    icon: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  teal: {
    chart: "#14b8a6",
    icon: "bg-teal-50 text-teal-600 ring-teal-100",
  },
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isManager = user?.role === "MANAGER";
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [dateFrom, setDateFrom] = useState(defaultPeriod.dateFrom);
  const [dateTo, setDateTo] = useState(defaultPeriod.dateTo);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [previousSummary, setPreviousSummary] = useState<DashboardSummary | null>(null);
  const [timeline, setTimeline] = useState<DashboardTimelinePoint[]>([]);
  const [byManufacturer, setByManufacturer] = useState<Array<{ manufacturerName: string; totalInternalSavingAmount: string; vehicleChecksCount: number }>>([]);
  const [byCollaborator, setByCollaborator] = useState<CollaboratorSaving[]>([]);

  useEffect(() => {
    const params = {
      collaboratorId: selectedCollaboratorId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    const previousParams = {
      collaboratorId: selectedCollaboratorId || undefined,
      ...previousPeriodParams(dateFrom, dateTo),
    };

    void Promise.all([
      businessService.dashboardSummary(params),
      businessService.dashboardSummary(previousParams),
      businessService.dashboardTimeline(params),
      businessService.savingsByManufacturer(params),
      businessService.savingsByCollaborator(params),
    ]).then(([summaryData, previousSummaryData, timelineData, manufacturerData, collaboratorData]) => {
      setSummary(summaryData);
      setPreviousSummary(previousSummaryData);
      setTimeline(timelineData);
      setByManufacturer(manufacturerData);
      setByCollaborator(collaboratorData);
    });
  }, [dateFrom, dateTo, selectedCollaboratorId]);

  const recentChecks = useMemo(() => {
    const checks = summary?.recentVehicleChecks ?? [];
    return checks.slice(0, 6);
  }, [summary?.recentVehicleChecks]);

  const comparisonTooltip = useMemo(() => {
    const previousPeriod = previousPeriodParams(dateFrom, dateTo);

    return {
      current: formatPeriodTooltip(dateFrom, dateTo),
      previous: previousPeriod.dateFrom && previousPeriod.dateTo ? formatPeriodTooltip(previousPeriod.dateFrom, previousPeriod.dateTo) : "Periode precedente non definie",
    };
  }, [dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const vehicleChecksCount = summary?.vehicleChecksCount ?? 0;
    const completedVehicleChecksCount = summary?.completedVehicleChecksCount ?? 0;
    const vehicleChecksToAnalyzeCount = summary?.vehicleChecksToAnalyzeCount ?? 0;
    const draftVehicleChecksCount = summary?.draftVehicleChecksCount ?? 0;
    const savings = numberValue(summary?.totalInternalSavingAmount);
    const cost = numberValue(summary?.totalInternalCost);
    const difference = numberValue(summary?.totalDifferenceAmount);
    const alerts = summary?.alertItemsCount ?? 0;
    const orders = summary?.partOrdersToPlaceCount ?? 0;
    const previousVehicleChecksCount = previousSummary?.vehicleChecksCount ?? 0;
    const previousCompletedVehicleChecksCount = previousSummary?.completedVehicleChecksCount ?? 0;
    const previousVehicleChecksToAnalyzeCount = previousSummary?.vehicleChecksToAnalyzeCount ?? 0;
    const previousDraftVehicleChecksCount = previousSummary?.draftVehicleChecksCount ?? 0;
    const previousSavings = numberValue(previousSummary?.totalInternalSavingAmount);
    const previousCost = numberValue(previousSummary?.totalInternalCost);
    const previousDifference = numberValue(previousSummary?.totalDifferenceAmount);
    const previousAlerts = previousSummary?.alertItemsCount ?? 0;
    const previousOrders = previousSummary?.partOrdersToPlaceCount ?? 0;

    return [
      {
        description: "Total sur la periode",
        chartData: timelineChartData(timeline, "vehicleChecksCount"),
        chartValueFormatter: formatInteger,
        icon: Car,
        title: "Vehicules controles",
        tone: "blue" as KpiTone,
        trend: trendLabel(vehicleChecksCount, previousVehicleChecksCount),
        trendTooltip: comparisonTooltip,
        value: formatInteger(vehicleChecksCount),
      },
      {
        description: "Syntheses finalisees",
        chartData: timelineChartData(timeline, "completedVehicleChecksCount"),
        chartValueFormatter: formatInteger,
        icon: CheckCircle2,
        title: "Controles completes",
        tone: "teal" as KpiTone,
        trend: trendLabel(completedVehicleChecksCount, previousCompletedVehicleChecksCount),
        trendTooltip: comparisonTooltip,
        value: formatInteger(completedVehicleChecksCount),
      },
      {
        description: "Decisions a traiter",
        chartData: timelineChartData(timeline, "vehicleChecksToAnalyzeCount"),
        chartValueFormatter: formatInteger,
        icon: ListChecks,
        title: "A analyser",
        tone: "amber" as KpiTone,
        trend: trendLabel(vehicleChecksToAnalyzeCount, previousVehicleChecksToAnalyzeCount),
        trendTooltip: comparisonTooltip,
        value: formatInteger(vehicleChecksToAnalyzeCount),
      },
      {
        description: "Gain interne estime",
        chartData: timelineChartData(timeline, "totalInternalSavingAmount"),
        chartValueFormatter: (amount: number) => formatMoney(amount),
        icon: Euro,
        title: "Economies",
        tone: "emerald" as KpiTone,
        trend: trendLabel(savings, previousSavings),
        trendTooltip: comparisonTooltip,
        value: formatCompactMoney(savings),
      },
      // {
      //   description: "Cout interne cumule",
      //   chartData: timelineChartData(timeline, "totalInternalCost"),
      //   chartValueFormatter: (amount: number) => formatMoney(amount),
      //   icon: FileSearch,
      //   title: "Cout interne",
      //   tone: "slate" as KpiTone,
      //   trend: trendLabel(cost, previousCost),
      //   trendTooltip: comparisonTooltip,
      //   value: formatCompactMoney(cost),
      // },
      {
        description: "Ecart total observe",
        chartData: timelineChartData(timeline, "totalDifferenceAmount"),
        chartValueFormatter: (amount: number) => formatMoney(amount),
        icon: TrendingUp,
        title: "Difference",
        tone: difference >= 0 ? ("emerald" as KpiTone) : ("red" as KpiTone),
        trend: trendLabel(difference, previousDifference),
        trendTooltip: comparisonTooltip,
        value: formatCompactMoney(difference),
      },
      // {
      //   description: "Points de vigilance",
      //   chartData: timelineChartData(timeline, "alertItemsCount"),
      //   chartValueFormatter: formatInteger,
      //   icon: AlertTriangle,
      //   title: "Alertes",
      //   tone: "red" as KpiTone,
      //   trend: trendLabel(alerts, previousAlerts),
      //   trendTooltip: comparisonTooltip,
      //   value: formatInteger(alerts),
      // },
      {
        description: "Pieces a commander",
        chartData: timelineChartData(timeline, "partOrdersToPlaceCount"),
        chartValueFormatter: formatInteger,
        icon: PackageCheck,
        title: "Commandes pieces",
        tone: "amber" as KpiTone,
        trend: trendLabel(orders, previousOrders),
        trendTooltip: comparisonTooltip,
        value: formatInteger(orders),
      },
      // {
      //   description: "Brouillons en cours",
      //   chartData: timelineChartData(timeline, "draftVehicleChecksCount"),
      //   chartValueFormatter: formatInteger,
      //   icon: ClipboardCheck,
      //   title: "Dossiers ouverts",
      //   tone: "slate" as KpiTone,
      //   trend: trendLabel(draftVehicleChecksCount, previousDraftVehicleChecksCount),
      //   trendTooltip: comparisonTooltip,
      //   value: formatInteger(draftVehicleChecksCount),
      // },
    ];
  }, [comparisonTooltip, previousSummary, summary, timeline]);

  const manufacturerChartData = useMemo(
    () =>
      byManufacturer.slice(0, 6).map((row) => ({
        amount: numberValue(row.totalInternalSavingAmount),
        name: row.manufacturerName,
      })),
    [byManufacturer],
  );
  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500">Bonjour, {user?.firstName || user?.email?.split("@")[0] || "equipe"}</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">{user?.role ?? "PROD"}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Tableau de bord</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
              Vue d'ensemble des controles, economies internes, alertes constructeur et commandes pieces a lancer.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 xl:w-[520px]">
            <div className="grid grid-cols-2 gap-2">
              <DateField label="Debut" value={dateFrom} onChange={setDateFrom} />
              <DateField label="Fin" value={dateTo} onChange={setDateTo} />
            </div>
            <div className="flex">
              <StatusPill icon={CalendarDays} label={formatPeriodLabel(dateFrom, dateTo)} />
            </div>
            <div>
              <ExportButton
                dateRange={{ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }}
                selectedCollaboratorId={selectedCollaboratorId}
                onCollaboratorChange={setSelectedCollaboratorId}
                withCollaboratorFilter
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flex snap-x gap-3 overflow-x-auto pb-2 pr-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 sm:pr-0 xl:grid-cols-3 2xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            chartData={kpi.chartData}
            chartValueFormatter={kpi.chartValueFormatter}
            description={kpi.description}
            icon={kpi.icon}
            key={kpi.title}
            title={kpi.title}
            tone={kpi.tone}
            trend={kpi.trend}
            trendTooltip={kpi.trendTooltip}
            value={kpi.value}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1.1fr]">
        <DashboardPanel icon={Clock3} subtitle="Derniers controles sur la periode" title={isManager ? "Activite de l'equipe" : "Activite recente"}>
          <div className="space-y-2">
            {recentChecks.map((check, index) => (
              <ActivityRow check={check} index={index} key={check.id} />
            ))}
            {!recentChecks.length ? <EmptyState label="Aucun controle recent ne correspond a la periode selectionnee." /> : null}
          </div>
        </DashboardPanel>

        <DashboardPanel icon={Euro} subtitle="Economies internes par marque" title="Constructeurs">
          {manufacturerChartData.length ? (
            <div className="h-56">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={manufacturerChartData} layout="vertical" margin={{ bottom: 8, left: 0, right: 16, top: 8 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis axisLine={false} tickLine={false} type="number" />
                  <YAxis axisLine={false} dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} type="category" width={92} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Bar dataKey="amount" radius={[0, 7, 7, 0]}>
                    {manufacturerChartData.map((entry, index) => (
                      <Cell fill={index % 2 === 0 ? "#14b8a6" : "#2563eb"} key={entry.name} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="Aucune economie constructeur pour le moment." />
          )}
        </DashboardPanel>

        <DashboardPanel icon={Users} subtitle="Volumes et economies par utilisateur" title="Collaborateurs">
          <div className="space-y-3">
            {byCollaborator.slice(0, 6).map((row, index) => (
              <CollaboratorRow index={index} key={row.collaboratorId} row={row} />
            ))}
            {!byCollaborator.length ? <EmptyState label="Aucune statistique collaborateur pour le moment." /> : null}
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}

function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      <Input
        className="h-9 rounded-lg border-slate-200 bg-white px-2 text-xs shadow-sm sm:text-sm"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function StatusPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-sm sm:text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      {label}
    </div>
  );
}

function KpiCard({
  chartData,
  chartValueFormatter,
  description,
  icon: Icon,
  title,
  tone,
  trend,
  trendTooltip,
  value,
}: {
  chartData: Array<{ name: string; value: number }>;
  chartValueFormatter: (value: number) => string;
  description: string;
  icon: LucideIcon;
  title: string;
  tone: KpiTone;
  trend: KpiTrend;
  trendTooltip: {
    current: string;
    previous: string;
  };
  value: string;
}) {
  const styles = toneStyles[tone];
  const tooltipTitle = `Periode actuelle : ${trendTooltip.current}\nPeriode precedente : ${trendTooltip.previous}`;

  return (
    <Card className="w-[82vw] max-w-[340px] shrink-0 snap-start overflow-visible rounded-[16px] border-[#e9e9e9] bg-white sm:w-auto sm:max-w-none sm:shrink">
      <CardContent className="p-4">
        <div className="grid min-h-28 grid-cols-[auto_1fr] gap-x-4 gap-y-3">
          <div className={cn("row-span-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-wide text-slate-950">{value}</p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-end gap-3">
            <div className="min-w-0">
              <span aria-label={tooltipTitle} className="group relative inline-block max-w-full cursor-help" tabIndex={0} title={tooltipTitle}>
                <span className={cn("block truncate text-xs font-bold", trend.className)}>{trend.label}</span>
                <span
                  className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 shadow-lg group-hover:block group-focus:block"
                  role="tooltip"
                >
                  <span className="block text-slate-950">Periode comparee</span>
                  <span className="mt-1 block">Actuelle : {trendTooltip.current}</span>
                  <span className="mt-0.5 block">Precedente : {trendTooltip.previous}</span>
                </span>
              </span>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{description}</p>
            </div>
            <div className="h-9 min-w-0">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData}>
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    content={<KpiChartTooltip title={title} valueFormatter={chartValueFormatter} />}
                    cursor={false}
                    offset={12}
                    wrapperStyle={{
                      pointerEvents: "none",
                      transform: "translate(-50%, -125%)",
                    }}
                  />
                  <Line dataKey="value" dot={chartData.length < 2} isAnimationActive={false} stroke={styles.chart} strokeWidth={2.5} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiChartTooltip({
  active,
  label,
  payload,
  title,
  valueFormatter,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ payload?: { name?: string }; value?: number | string }>;
  title: string;
  valueFormatter: (value: number) => string;
}) {
  const rawValue = payload?.[0]?.value;
  const pointDate = payload?.[0]?.payload?.name ?? (typeof label === "string" ? label : null);
  const value = numberValue(rawValue);

  if (!active || rawValue === undefined) {
    return null;
  }

  return (
    <div className="min-w-36 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-[11px] font-semibold text-slate-700 shadow-lg backdrop-blur">
      <p className="truncate text-slate-950">{title}</p>
      <p className="mt-1 whitespace-nowrap">{pointDate ? formatLongDate(pointDate) : "Date non definie"}</p>
      <p className="mt-0.5 whitespace-nowrap">{valueFormatter(value)}</p>
    </div>
  );
}

function DashboardPanel({ children, icon: Icon, subtitle, title }: { children: ReactNode; icon: LucideIcon; subtitle: string; title: string }) {
  return (
    <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-950">{title}</CardTitle>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function ActivityRow({ check, index }: { check: VehicleCheck; index: number }) {
  const collaborator = check.collaborator ? `${check.collaborator.firstName} ${check.collaborator.lastName}` : "Controle non assigne";
  const damageCount = check.items?.length ?? 0;
  const selectedDamageCount = check.items?.filter((item) => item.selectedForSummary).length ?? 0;
  const status = statusLabel(check.status);

  return (
    <Link
      aria-label={`Ouvrir le controle du vehicule ${check.licensePlate}`}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      href={`/dashboard/vehicle-checks/${check.id}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">{check.licensePlate}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", status.className)}>{status.label}</span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          {check.manufacturer?.name ?? "Constructeur"} {check.vehicleModel?.name ?? ""} - {collaborator}
        </p>
      </div>
      <div className="max-w-40 text-right">
        <p className="text-xs font-semibold text-slate-500">{formatDate(check.checkDate)}</p>
        <p className="mt-1 text-[11px] font-semibold text-teal-700">
          {damageCount} degat{damageCount > 1 ? "s" : ""} constate{damageCount > 1 ? "s" : ""}
        </p>
        <p className="text-[10px] font-semibold text-slate-500">
          {selectedDamageCount} selectionne{selectedDamageCount > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}

function CollaboratorRow({ index, row }: { index: number; row: CollaboratorSaving }) {
  const amount = numberValue(row.totalInternalSavingAmount);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700">{index + 1}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{row.collaboratorName}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{row.vehicleChecksCount} controle(s)</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-950">{formatCompactMoney(amount)}</p>
        <p className="text-xs font-medium text-emerald-600">economies</p>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">{label}</div>;
}

type TimelineMetric =
  | "alertItemsCount"
  | "completedVehicleChecksCount"
  | "draftVehicleChecksCount"
  | "partOrdersToPlaceCount"
  | "totalDifferenceAmount"
  | "totalInternalCost"
  | "totalInternalSavingAmount"
  | "vehicleChecksCount"
  | "vehicleChecksToAnalyzeCount";

function timelineChartData(timeline: DashboardTimelinePoint[], metric: TimelineMetric) {
  return timeline.map((point) => ({
    name: point.date,
    value: numberValue(point[metric]),
  }));
}

function previousPeriodParams(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) {
    return {};
  }

  const from = inputDate(dateFrom);
  const to = inputDate(dateTo);

  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    return {};
  }

  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const days = Math.max(1, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1);
  const previousTo = addDays(start, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  return {
    dateFrom: toInputDate(previousFrom),
    dateTo: toInputDate(previousTo),
  };
}

function trendLabel(current: number, previous: number): KpiTrend {
  const delta = current - previous;
  const className = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-slate-500";

  if (previous === 0) {
    return {
      className,
      label: `${formatSignedNumber(delta)} vs periode precedente`,
    };
  }

  const percent = (delta / Math.abs(previous)) * 100;

  return {
    className,
    label: `${formatSignedPercent(percent)} vs periode precedente`,
  };
}

function statusLabel(status: VehicleCheck["status"]) {
  if (status === "SUMMARY_READY") return { className: "bg-emerald-50 text-emerald-700", label: "Complete" };
  if (status === "TO_ANALYZE") return { className: "bg-amber-50 text-amber-700", label: "A analyser" };
  if (status === "CANCELLED") return { className: "bg-red-50 text-red-700", label: "Annule" };
  return { className: "bg-slate-100 text-slate-600", label: "Brouillon" };
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatSignedNumber(value: number) {
  if (value === 0) return "0";

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    signDisplay: "always",
  }).format(value);
}

function formatSignedPercent(value: number) {
  if (value === 0) return "0%";

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    signDisplay: "always",
    style: "percent",
  }).format(value / 100);
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    style: "currency",
  }).format(value);
}

function formatPeriodLabel(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return "Periode non definie";
  return `Du ${formatLongDate(dateFrom)} au ${formatLongDate(dateTo)}`;
}

function formatPeriodTooltip(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return "Periode non definie";
  return `${formatLongDate(dateFrom)} - ${formatLongDate(dateTo)}`;
}

function formatLongDate(value: string) {
  const date = inputDate(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getDefaultPeriod() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 30);

  return {
    dateFrom: toInputDate(start),
    dateTo: toInputDate(today),
  };
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function inputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
