"use client";

import {
  ArrowRight,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Euro,
  FileText,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  Plus,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExportButton } from "@/components/business/export-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatLicensePlate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import { riskService } from "@/services/risk.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  DashboardSummary,
  DashboardTimelinePoint,
  VehicleCheck,
} from "@/types/business";
import { RiskVehicle, RiskVehicleStatus } from "@/types/risk";

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
type DashboardKpi = {
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
};
type DashboardTab = "buy-back" | "risk";

const DASHBOARD_TAB_STORAGE_KEY = "dashboard:last-tab";

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
  const [activeTab, setActiveTab] = useState<DashboardTab>("buy-back");
  const [dateFrom, setDateFrom] = useState(defaultPeriod.dateFrom);
  const [dateTo, setDateTo] = useState(defaultPeriod.dateTo);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [previousSummary, setPreviousSummary] =
    useState<DashboardSummary | null>(null);
  const [timeline, setTimeline] = useState<DashboardTimelinePoint[]>([]);
  const [byManufacturer, setByManufacturer] = useState<
    Array<{
      manufacturerName: string;
      totalInternalSavingAmount: string;
      vehicleChecksCount: number;
    }>
  >([]);
  const [byCollaborator, setByCollaborator] = useState<CollaboratorSaving[]>(
    [],
  );
  const [riskVehicles, setRiskVehicles] = useState<RiskVehicle[]>([]);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState(false);

  useEffect(() => {
    const storedTab = window.localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
    let restoreTabFrame: number | undefined;
    if (storedTab === "buy-back" || storedTab === "risk") {
      restoreTabFrame = window.requestAnimationFrame(() =>
        setActiveTab(storedTab),
      );
    }

    void riskService
      .list()
      .then((vehicles) => {
        setRiskVehicles(vehicles);
        setRiskError(false);
      })
      .catch(() => setRiskError(true))
      .finally(() => setRiskLoading(false));

    return () => {
      if (restoreTabFrame !== undefined)
        window.cancelAnimationFrame(restoreTabFrame);
    };
  }, []);

  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, tab);
  };

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
    ]).then(
      ([
        summaryData,
        previousSummaryData,
        timelineData,
        manufacturerData,
        collaboratorData,
      ]) => {
        setSummary(summaryData);
        setPreviousSummary(previousSummaryData);
        setTimeline(timelineData);
        setByManufacturer(manufacturerData);
        setByCollaborator(collaboratorData);
      },
    );
  }, [dateFrom, dateTo, selectedCollaboratorId]);

  const recentChecks = useMemo(() => {
    const checks = summary?.recentVehicleChecks ?? [];
    return checks.slice(0, 6);
  }, [summary?.recentVehicleChecks]);

  const comparisonTooltip = useMemo(() => {
    const previousPeriod = previousPeriodParams(dateFrom, dateTo);

    return {
      current: formatPeriodTooltip(dateFrom, dateTo),
      previous:
        previousPeriod.dateFrom && previousPeriod.dateTo
          ? formatPeriodTooltip(previousPeriod.dateFrom, previousPeriod.dateTo)
          : "Periode precedente non definie",
    };
  }, [dateFrom, dateTo]);

  const buyBackKpis = useMemo(() => {
    const vehicleChecksCount = summary?.vehicleChecksCount ?? 0;
    const completedVehicleChecksCount =
      summary?.completedVehicleChecksCount ?? 0;
    const vehicleChecksToAnalyzeCount =
      summary?.vehicleChecksToAnalyzeCount ?? 0;
    const savings = numberValue(summary?.totalInternalSavingAmount);
    const difference = numberValue(summary?.totalDifferenceAmount);
    const orders = summary?.partOrdersToPlaceCount ?? 0;
    const previousVehicleChecksCount = previousSummary?.vehicleChecksCount ?? 0;
    const previousCompletedVehicleChecksCount =
      previousSummary?.completedVehicleChecksCount ?? 0;
    const previousVehicleChecksToAnalyzeCount =
      previousSummary?.vehicleChecksToAnalyzeCount ?? 0;
    const previousSavings = numberValue(
      previousSummary?.totalInternalSavingAmount,
    );
    const previousDifference = numberValue(
      previousSummary?.totalDifferenceAmount,
    );
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
        description: "Dossiers reellement termines",
        chartData: timelineChartData(timeline, "completedVehicleChecksCount"),
        chartValueFormatter: formatInteger,
        icon: CheckCircle2,
        title: "Controles termines",
        tone: "teal" as KpiTone,
        trend: trendLabel(
          completedVehicleChecksCount,
          previousCompletedVehicleChecksCount,
        ),
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
        trend: trendLabel(
          vehicleChecksToAnalyzeCount,
          previousVehicleChecksToAnalyzeCount,
        ),
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

  const filteredRiskVehicles = useMemo(
    () =>
      riskVehicles.filter((vehicle) =>
        isDateInPeriod(vehicle.createdAt, dateFrom, dateTo),
      ),
    [dateFrom, dateTo, riskVehicles],
  );

  const riskStats = useMemo(() => {
    const countStatus = (status: RiskVehicleStatus) =>
      filteredRiskVehicles.filter((vehicle) => vehicle.status === status)
        .length;

    return {
      closed: countStatus("CLOSED"),
      comments: filteredRiskVehicles.reduce(
        (total, vehicle) =>
          total + (vehicle.conversation?.messages.length ?? 0),
        0,
      ),
      created: filteredRiskVehicles.length,
      documents: filteredRiskVehicles.reduce(
        (total, vehicle) =>
          total +
          (vehicle.conversation?.messages.reduce(
            (messageTotal, message) =>
              messageTotal + message.attachments.length,
            0,
          ) ?? 0),
        0,
      ),
      draft: countStatus("DRAFT"),
      submitted: countStatus("SUBMITTED"),
    };
  }, [filteredRiskVehicles]);

  const recentRiskVehicles = useMemo(
    () =>
      [...filteredRiskVehicles]
        .sort(
          (first, second) =>
            new Date(second.updatedAt).getTime() -
            new Date(first.updatedAt).getTime(),
        )
        .slice(0, 6),
    [filteredRiskVehicles],
  );

  const riskAssigneeRows = useMemo(
    () => riskActivityByAssignee(filteredRiskVehicles).slice(0, 6),
    [filteredRiskVehicles],
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500">
                Bonjour,{" "}
                {user?.firstName || user?.email?.split("@")[0] || "equipe"}
              </p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                {user?.role ?? "PROD"}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
              Tableau de bord
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
              {activeTab === "buy-back"
                ? "Pilotage des contrôles, économies internes et commandes de pièces Buy Back."
                : "Suivi des dossiers photographiques, analyses et échanges Risk Showroom."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 xl:w-[520px]">
            <div className="grid grid-cols-2 gap-2">
              <DateField
                label="Debut"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <DateField label="Fin" value={dateTo} onChange={setDateTo} />
            </div>
            <div className="flex">
              <StatusPill
                icon={CalendarDays}
                label={formatPeriodLabel(dateFrom, dateTo)}
              />
            </div>
            {activeTab === "buy-back" ? (
              <div>
                <ExportButton
                  dateRange={{
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                  }}
                  selectedCollaboratorId={selectedCollaboratorId}
                  onCollaboratorChange={setSelectedCollaboratorId}
                  withCollaboratorFilter
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link href="/dashboard/risk">Voir les dossiers</Link>
                </Button>
                <Button asChild>
                  <Link href="/dashboard/risk/new">
                    <Plus className="h-4 w-4" />
                    Nouveau dossier
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <DashboardTabs activeTab={activeTab} onChange={selectTab} />

      {activeTab === "buy-back" ? (
        <BuyBackDashboard
          byCollaborator={byCollaborator}
          isManager={isManager}
          kpis={buyBackKpis}
          manufacturerChartData={manufacturerChartData}
          recentChecks={recentChecks}
        />
      ) : (
        <RiskDashboard
          error={riskError}
          isLoading={riskLoading}
          recentVehicles={recentRiskVehicles}
          stats={riskStats}
          userId={user?.id}
          assigneeRows={riskAssigneeRows}
        />
      )}
    </div>
  );
}

function DashboardTabs({
  activeTab,
  onChange,
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  const tabs: Array<{ icon: LucideIcon; id: DashboardTab; label: string }> = [
    { icon: Car, id: "buy-back", label: "Buy Back" },
    { icon: Camera, id: "risk", label: "Risk" },
  ];

  return (
    <nav
      aria-label="Activité du tableau de bord"
      className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:inline-grid sm:min-w-[420px]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;

        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1",
              isActive
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
            )}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon className={cn("h-4 w-4", isActive && "text-teal-700")} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function BuyBackDashboard({
  byCollaborator,
  isManager,
  kpis,
  manufacturerChartData,
  recentChecks,
}: {
  byCollaborator: CollaboratorSaving[];
  isManager: boolean;
  kpis: DashboardKpi[];
  manufacturerChartData: Array<{ amount: number; name: string }>;
  recentChecks: VehicleCheck[];
}) {
  return (
    <div className="space-y-6">
      <section className="flex snap-x gap-3 overflow-x-auto pb-2 pr-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 sm:pr-0 xl:grid-cols-3 2xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard {...kpi} key={kpi.title} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1.1fr]">
        <DashboardPanel
          icon={Clock3}
          subtitle="Derniers contrôles sur la période"
          title={isManager ? "Activité de l'équipe" : "Activité récente"}
        >
          <div className="space-y-2">
            {recentChecks.map((check, index) => (
              <ActivityRow check={check} index={index} key={check.id} />
            ))}
            {!recentChecks.length ? (
              <EmptyState label="Aucun contrôle récent ne correspond à la période sélectionnée." />
            ) : null}
          </div>
        </DashboardPanel>

        <DashboardPanel
          icon={Euro}
          subtitle="Économies internes par marque"
          title="Constructeurs"
        >
          {manufacturerChartData.length ? (
            <div className="h-56">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={manufacturerChartData}
                  layout="vertical"
                  margin={{ bottom: 8, left: 0, right: 16, top: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis axisLine={false} tickLine={false} type="number" />
                  <YAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickLine={false}
                    type="category"
                    width={92}
                  />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Bar dataKey="amount" radius={[0, 7, 7, 0]}>
                    {manufacturerChartData.map((entry, index) => (
                      <Cell
                        fill={index % 2 === 0 ? "#14b8a6" : "#2563eb"}
                        key={entry.name}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="Aucune économie constructeur pour le moment." />
          )}
        </DashboardPanel>

        <DashboardPanel
          icon={Users}
          subtitle="Volumes et économies par utilisateur"
          title="Collaborateurs"
        >
          <div className="space-y-3">
            {byCollaborator.slice(0, 6).map((row, index) => (
              <CollaboratorRow
                index={index}
                key={row.collaboratorId}
                row={row}
              />
            ))}
            {!byCollaborator.length ? (
              <EmptyState label="Aucune statistique collaborateur pour le moment." />
            ) : null}
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}

type RiskDashboardStats = {
  closed: number;
  comments: number;
  created: number;
  documents: number;
  draft: number;
  submitted: number;
};

type RiskAssigneeActivity = {
  closed: number;
  id: string;
  name: string;
  submitted: number;
  total: number;
};

function RiskDashboard({
  assigneeRows,
  error,
  isLoading,
  recentVehicles,
  stats,
  userId,
}: {
  assigneeRows: RiskAssigneeActivity[];
  error: boolean;
  isLoading: boolean;
  recentVehicles: RiskVehicle[];
  stats: RiskDashboardStats;
  userId?: string;
}) {
  const cards: Array<{
    description: string;
    icon: LucideIcon;
    label: string;
    tone: KpiTone;
    value: number;
  }> = [
    {
      description: "Sur la période",
      icon: Camera,
      label: "Dossiers créés",
      tone: "blue",
      value: stats.created,
    },
    {
      description: "À compléter",
      icon: ClipboardCheck,
      label: "Brouillons",
      tone: "slate",
      value: stats.draft,
    },
    {
      description: "En attente de traitement",
      icon: Clock3,
      label: "Transmis / à analyser",
      tone: "amber",
      value: stats.submitted,
    },
    {
      description: "Analyses terminées",
      icon: CheckCircle2,
      label: "Dossiers clos",
      tone: "emerald",
      value: stats.closed,
    },
    {
      description: "Échanges sur les dossiers",
      icon: MessageSquareText,
      label: "Commentaires",
      tone: "teal",
      value: stats.comments,
    },
    {
      description: "Fichiers partagés",
      icon: FileText,
      label: "Documents",
      tone: "blue",
      value: stats.documents,
    },
  ];
  const statusData = [
    { color: "#64748b", name: "Brouillons", value: stats.draft },
    { color: "#f59e0b", name: "À analyser", value: stats.submitted },
    { color: "#10b981", name: "Clos", value: stats.closed },
  ];

  if (isLoading) {
    return <EmptyState label="Chargement des indicateurs Risk…" />;
  }

  if (error) {
    return (
      <EmptyState label="Les indicateurs Risk n'ont pas pu être chargés." />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <RiskStatCard {...card} key={card.label} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr_0.9fr]">
        <DashboardPanel
          icon={Clock3}
          subtitle="Derniers dossiers mis à jour sur la période"
          title="Activité récente"
        >
          <div className="space-y-2">
            {recentVehicles.map((vehicle, index) => (
              <RiskActivityRow
                index={index}
                key={vehicle.id}
                userId={userId}
                vehicle={vehicle}
              />
            ))}
            {!recentVehicles.length ? (
              <EmptyState label="Aucun dossier Risk ne correspond à la période sélectionnée." />
            ) : null}
          </div>
        </DashboardPanel>

        <DashboardPanel
          icon={ListChecks}
          subtitle="Répartition des dossiers"
          title="Avancement"
        >
          {stats.created ? (
            <div className="h-56">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ bottom: 8, left: 0, right: 18, top: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickLine={false}
                    type="category"
                    width={82}
                  />
                  <Tooltip
                    formatter={(value) => formatInteger(Number(value))}
                  />
                  <Bar dataKey="value" radius={[0, 7, 7, 0]}>
                    {statusData.map((entry) => (
                      <Cell fill={entry.color} key={entry.name} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="Aucune donnée d'avancement sur cette période." />
          )}
        </DashboardPanel>

        <DashboardPanel
          icon={Users}
          subtitle="Dossiers confiés par responsable"
          title="Personnes assignées"
        >
          <div className="space-y-3">
            {assigneeRows.map((row, index) => (
              <RiskAssigneeRow index={index} key={row.id} row={row} />
            ))}
            {!assigneeRows.length ? (
              <EmptyState label="Aucune personne assignée sur cette période." />
            ) : null}
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}

function RiskStatCard({
  description,
  icon: Icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  tone: KpiTone;
  value: number;
}) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex min-h-28 items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            toneStyles[tone].icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-950">
            {formatInteger(value)}
          </p>
          <p className="truncate text-[11px] font-bold uppercase text-slate-600">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskActivityRow({
  index,
  userId,
  vehicle,
}: {
  index: number;
  userId?: string;
  vehicle: RiskVehicle;
}) {
  const assignee = vehicle.assignments.find(
    (assignment) => assignment.role === "PRIMARY",
  )?.user;
  const messageCount = vehicle.conversation?.messages.length ?? 0;
  const status = riskStatusLabel(vehicle, userId);

  return (
    <Link
      aria-label={`Ouvrir le dossier Risk ${vehicle.riskNumber}`}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      href={`/dashboard/risk/${vehicle.id}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">
            {riskVehiclePlate(vehicle)}
          </p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          {vehicle.riskNumber} · {vehicle.manufacturer.name}
          {assignee
            ? ` · ${`${assignee.firstName} ${assignee.lastName}`.trim()}`
            : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-slate-500">
          {formatDate(vehicle.updatedAt)}
        </p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-teal-700">
          <MessageSquareText className="h-3.5 w-3.5" />
          {messageCount}
        </p>
      </div>
      <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
    </Link>
  );
}

function RiskAssigneeRow({
  index,
  row,
}: {
  index: number;
  row: RiskAssigneeActivity;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-sm font-bold text-teal-700">
        {index + 1}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {row.total} dossier{row.total > 1 ? "s" : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-amber-600">
          {row.submitted} à analyser
        </p>
        <p className="text-xs font-medium text-emerald-600">
          {row.closed} clos
        </p>
      </div>
    </div>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-bold uppercase text-slate-500">
        {label}
      </span>
      <Input
        className="h-9 rounded-lg border-slate-200 bg-white px-2 text-xs shadow-sm sm:text-sm"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function StatusPill({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
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
          <div
            className={cn(
              "row-span-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
              styles.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-wide text-slate-950">
              {value}
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-end gap-3">
            <div className="min-w-0">
              <span
                aria-label={tooltipTitle}
                className="group relative inline-block max-w-full cursor-help"
                tabIndex={0}
                title={tooltipTitle}
              >
                <span
                  className={cn(
                    "block truncate text-xs font-bold",
                    trend.className,
                  )}
                >
                  {trend.label}
                </span>
                <span
                  className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 shadow-lg group-hover:block group-focus:block"
                  role="tooltip"
                >
                  <span className="block text-slate-950">Periode comparee</span>
                  <span className="mt-1 block">
                    Actuelle : {trendTooltip.current}
                  </span>
                  <span className="mt-0.5 block">
                    Precedente : {trendTooltip.previous}
                  </span>
                </span>
              </span>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {description}
              </p>
            </div>
            <div className="h-9 min-w-0">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData}>
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    content={
                      <KpiChartTooltip
                        title={title}
                        valueFormatter={chartValueFormatter}
                      />
                    }
                    cursor={false}
                    offset={12}
                    wrapperStyle={{
                      pointerEvents: "none",
                      transform: "translate(-50%, -125%)",
                    }}
                  />
                  <Line
                    dataKey="value"
                    dot={chartData.length < 2}
                    isAnimationActive={false}
                    stroke={styles.chart}
                    strokeWidth={2.5}
                    type="monotone"
                  />
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
  const pointDate =
    payload?.[0]?.payload?.name ?? (typeof label === "string" ? label : null);
  const value = numberValue(rawValue);

  if (!active || rawValue === undefined) {
    return null;
  }

  return (
    <div className="min-w-36 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-[11px] font-semibold text-slate-700 shadow-lg backdrop-blur">
      <p className="truncate text-slate-950">{title}</p>
      <p className="mt-1 whitespace-nowrap">
        {pointDate ? formatLongDate(pointDate) : "Date non definie"}
      </p>
      <p className="mt-0.5 whitespace-nowrap">{valueFormatter(value)}</p>
    </div>
  );
}

function DashboardPanel({
  children,
  icon: Icon,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  subtitle: string;
  title: string;
}) {
  return (
    <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-950">
              {title}
            </CardTitle>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function ActivityRow({ check, index }: { check: VehicleCheck; index: number }) {
  const collaborator = check.collaborator
    ? `${check.collaborator.firstName} ${check.collaborator.lastName}`
    : "Controle non assigne";
  const damageCount = check.items?.length ?? 0;
  const selectedDamageCount =
    check.items?.filter((item) => item.selectedForSummary).length ?? 0;
  const status = statusLabel(check);

  return (
    <Link
      aria-label={`Ouvrir le controle du vehicule ${check.licensePlate}`}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      href={`/dashboard/vehicle-checks/${check.id}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">
            {check.licensePlate}
          </p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          {check.manufacturer?.name ?? "Constructeur"}{" "}
          {check.vehicleModel?.name ?? ""} - {collaborator}
        </p>
      </div>
      <div className="max-w-40 text-right">
        <p className="text-xs font-semibold text-slate-500">
          {formatDate(check.checkDate)}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-teal-700">
          {damageCount} degat{damageCount > 1 ? "s" : ""} constate
          {damageCount > 1 ? "s" : ""}
        </p>
        <p className="text-[10px] font-semibold text-slate-500">
          {selectedDamageCount} selectionne{selectedDamageCount > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}

function CollaboratorRow({
  index,
  row,
}: {
  index: number;
  row: CollaboratorSaving;
}) {
  const amount = numberValue(row.totalInternalSavingAmount);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700">
        {index + 1}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">
          {row.collaboratorName}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {row.vehicleChecksCount} controle(s)
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-950">
          {formatCompactMoney(amount)}
        </p>
        <p className="text-xs font-medium text-emerald-600">economies</p>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
      {label}
    </div>
  );
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

function timelineChartData(
  timeline: DashboardTimelinePoint[],
  metric: TimelineMetric,
) {
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
  const days = Math.max(
    1,
    Math.round(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000,
    ) + 1,
  );
  const previousTo = addDays(start, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  return {
    dateFrom: toInputDate(previousFrom),
    dateTo: toInputDate(previousTo),
  };
}

function trendLabel(current: number, previous: number): KpiTrend {
  const delta = current - previous;
  const className =
    delta > 0
      ? "text-emerald-600"
      : delta < 0
        ? "text-red-500"
        : "text-slate-500";

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

function statusLabel(check: VehicleCheck) {
  const { publicShare, status } = check;

  if (
    status === "CLOSED_NO_DAMAGE" ||
    status === "COMPLETED" ||
    publicShare?.vehicleRecoveredAt
  ) {
    return { className: "bg-blue-50 text-blue-700", label: "Terminé" };
  }
  if (status === "SUMMARY_READY") {
    return publicShare?.takenInChargeAt
      ? { className: "bg-amber-50 text-amber-700", label: "Récupération" }
      : { className: "bg-amber-50 text-amber-700", label: "Dépôt à confirmer" };
  }
  if (status === "TO_ANALYZE")
    return { className: "bg-amber-50 text-amber-700", label: "A analyser" };
  if (status === "CANCELLED")
    return { className: "bg-red-50 text-red-700", label: "Annule" };
  return { className: "bg-slate-100 text-slate-600", label: "Brouillon" };
}

function riskStatusLabel(vehicle: RiskVehicle, userId?: string) {
  if (vehicle.status === "DRAFT")
    return { className: "bg-slate-100 text-slate-600", label: "Brouillon" };
  if (vehicle.status === "CLOSED")
    return { className: "bg-emerald-50 text-emerald-700", label: "Clos" };
  return vehicle.creatorId === userId
    ? { className: "bg-amber-50 text-amber-700", label: "Transmis" }
    : { className: "bg-amber-50 text-amber-700", label: "À analyser" };
}

function riskVehiclePlate(vehicle: RiskVehicle) {
  return formatLicensePlate(
    vehicle.licensePlate,
    vehicle.licensePlateCountry,
    vehicle.licensePlateRaw,
  );
}

function riskActivityByAssignee(
  vehicles: RiskVehicle[],
): RiskAssigneeActivity[] {
  const activity = new Map<string, RiskAssigneeActivity>();

  vehicles.forEach((vehicle) => {
    const primary = vehicle.assignments.find(
      (assignment) => assignment.role === "PRIMARY",
    )?.user;
    if (!primary) return;

    const row = activity.get(primary.id) ?? {
      closed: 0,
      id: primary.id,
      name: `${primary.firstName} ${primary.lastName}`.trim() || primary.email,
      submitted: 0,
      total: 0,
    };
    row.total += 1;
    if (vehicle.status === "SUBMITTED") row.submitted += 1;
    if (vehicle.status === "CLOSED") row.closed += 1;
    activity.set(primary.id, row);
  });

  return [...activity.values()].sort(
    (first, second) =>
      second.total - first.total || first.name.localeCompare(second.name, "fr"),
  );
}

function isDateInPeriod(value: string, dateFrom: string, dateTo: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;

  if (dateFrom) {
    const from = inputDate(dateFrom);
    if (date < startOfDay(from)) return false;
  }

  if (dateTo) {
    const to = inputDate(dateTo);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }

  return true;
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
