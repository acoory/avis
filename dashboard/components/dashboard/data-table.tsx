"use client";

import { ReactNode, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SortDirection = "asc" | "desc";

type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  searchValue?: (row: T) => string | number | null | undefined;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  mobileCard?: (row: T) => ReactNode;
  minWidth?: number;
  initialSort?: {
    column: string;
    direction: SortDirection;
  };
  isLoading?: boolean;
  showSearch?: boolean;
  dateFilter?: {
    label: string;
    getValue: (row: T) => string | Date | null | undefined;
    mode?: "client" | "server";
    value?: { dateFrom?: string; dateTo?: string };
    onChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
  };
  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onSortChange: (column: string, direction: SortDirection) => void;
  };
};

const pageSizeOptions = [10, 25, 50, 100];

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "Aucune donnee.",
  mobileCard,
  minWidth = 760,
  initialSort,
  isLoading = false,
  showSearch = true,
  dateFilter,
  serverPagination,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(initialSort?.column ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort?.direction ?? "asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const searchTimerRef = useRef<number | null>(null);
  const selectedDateFrom = dateFilter?.value?.dateFrom ?? dateFrom;
  const selectedDateTo = dateFilter?.value?.dateTo ?? dateTo;

  const filteredData = useMemo(() => {
    if (serverPagination) return data;

    const normalizedSearch = search.trim().toLowerCase();
    const fromTime = selectedDateFrom ? startOfDay(selectedDateFrom) : null;
    const toTime = selectedDateTo ? endOfDay(selectedDateTo) : null;

    return data.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        columns.some((column) =>
          String(column.searchValue?.(row) ?? column.sortValue?.(row) ?? "")
            .toLowerCase()
            .includes(normalizedSearch),
        );

      if (!matchesSearch) {
        return false;
      }

      if (!dateFilter || dateFilter.mode === "server" || (!fromTime && !toTime)) {
        return true;
      }

      const rowTime = toDateTime(dateFilter.getValue(row));
      if (rowTime === null) {
        return false;
      }

      return (!fromTime || rowTime >= fromTime) && (!toTime || rowTime <= toTime);
    });
  }, [columns, data, dateFilter, selectedDateFrom, selectedDateTo, search, serverPagination]);

  const sortedData = useMemo(() => {
    if (serverPagination) return filteredData;

    const column = columns.find((item) => item.id === sortColumn);
    if (!sortColumn || !column?.sortValue) {
      return filteredData;
    }

    return [...filteredData].sort((firstRow, secondRow) => {
      const firstValue = normalizeSortValue(column.sortValue?.(firstRow));
      const secondValue = normalizeSortValue(column.sortValue?.(secondRow));
      const result = firstValue.localeCompare(secondValue, "fr", { numeric: true, sensitivity: "base" });

      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, filteredData, serverPagination, sortColumn, sortDirection]);

  const effectivePageSize = serverPagination?.pageSize ?? pageSize;
  const totalRows = serverPagination?.total ?? sortedData.length;
  const totalPages = serverPagination?.totalPages ?? Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = serverPagination?.page ?? Math.min(page, totalPages);
  const visibleRows = serverPagination
    ? data
    : sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = totalRows ? (safePage - 1) * effectivePageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * effectivePageSize, totalRows);
  const placeholderRowCount = Math.min(effectivePageSize, 10);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) {
      return;
    }

    setPage(1);
    if (sortColumn === column.id) {
      const nextDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(nextDirection);
      serverPagination?.onSortChange(column.id, nextDirection);
      return;
    }

    setSortColumn(column.id);
    setSortDirection("asc");
    serverPagination?.onSortChange(column.id, "asc");
  }

  function updatePageSize(value: string) {
    const nextPageSize = Number(value);
    setPageSize(nextPageSize);
    setPage(1);
    serverPagination?.onPageSizeChange(nextPageSize);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);

    if (!serverPagination) return;
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      serverPagination.onSearchChange(value);
    }, 300);
  }

  return (
    <Card className="min-w-0">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          {showSearch ? (
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Rechercher"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {dateFilter ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    {dateFilter.label} debut
                  </label>
                  <Input
                    type="date"
                    value={selectedDateFrom}
                    onChange={(event) => {
                      const nextDateFrom = event.target.value;
                      setDateFrom(nextDateFrom);
                      setPage(1);
                      dateFilter.onChange?.({
                        dateFrom: nextDateFrom || undefined,
                        dateTo: selectedDateTo || undefined,
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    {dateFilter.label} fin
                  </label>
                  <Input
                    type="date"
                    value={selectedDateTo}
                    onChange={(event) => {
                      const nextDateTo = event.target.value;
                      setDateTo(nextDateTo);
                      setPage(1);
                      dateFilter.onChange?.({
                        dateFrom: selectedDateFrom || undefined,
                        dateTo: nextDateTo || undefined,
                      });
                    }}
                  />
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {mobileCard ? (
          <div className="divide-y divide-gray-100 md:hidden">
            {isLoading
              ? Array.from({ length: placeholderRowCount }, (_, rowIndex) => (
                  <div className="p-3" key={`mobile-placeholder-${rowIndex}`}>
                    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-3">
                      <div className="h-4 w-2/5 rounded bg-gray-200" />
                      <div className="mt-3 h-3 w-3/5 rounded bg-gray-100" />
                      <div className="mt-4 h-7 w-1/3 rounded bg-gray-100" />
                    </div>
                  </div>
                ))
              : visibleRows.map((row, rowIndex) => (
                  <div className="p-3" key={rowIndex}>
                    {mobileCard(row)}
                  </div>
                ))}
            {!isLoading && !visibleRows.length ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">{emptyMessage}</div>
            ) : null}
          </div>
        ) : null}

        <div className={mobileCard ? "hidden min-w-0 overflow-x-auto md:block" : "min-w-0 overflow-x-auto"}>
          <table className="w-full text-left text-sm" style={{ minWidth }}>
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {columns.map((column) => {
                  const isSorted = sortColumn === column.id;

                  return (
                    <th className="px-4 py-3 font-medium" key={column.id}>
                      {column.sortValue ? (
                        <button
                          className="inline-flex items-center gap-2 text-left uppercase hover:text-gray-950"
                          type="button"
                          onClick={() => toggleSort(column)}
                        >
                          {column.header}
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? Array.from({ length: placeholderRowCount }, (_, rowIndex) => (
                    <tr className="animate-pulse" key={`placeholder-${rowIndex}`}>
                      {columns.map((column, columnIndex) => (
                        <td className="px-4 py-4" key={column.id}>
                          <div
                            className="h-4 rounded bg-gray-200"
                            style={{ width: `${45 + ((rowIndex + columnIndex) % 4) * 12}%` }}
                          />
                          {columnIndex < 2 ? <div className="mt-2 h-3 w-2/5 rounded bg-gray-100" /> : null}
                        </td>
                      ))}
                    </tr>
                  ))
                : visibleRows.map((row, rowIndex) => (
                    <tr className="transition-colors hover:bg-teal-50/40" key={rowIndex}>
                      {columns.map((column) => (
                        <td className={column.className ?? "px-4 py-3 text-gray-600"} key={column.id}>
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
              {!isLoading && !visibleRows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={columns.length}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span>
              {rangeStart}-{rangeEnd} sur {totalRows}
            </span>
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Chargement...
              </span>
            ) : null}
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
              Afficher
              <select
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 shadow-sm"
                disabled={isLoading}
                value={effectivePageSize}
                onChange={(event) => updatePageSize(event.target.value)}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              lignes
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={isLoading || safePage <= 1}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                const nextPage = Math.max(1, safePage - 1);
                setPage(nextPage);
                serverPagination?.onPageChange(nextPage);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedent
            </Button>
            <span className="min-w-20 text-center">
              Page {safePage} / {totalPages}
            </span>
            <Button
              disabled={isLoading || safePage >= totalPages}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                const nextPage = Math.min(totalPages, safePage + 1);
                setPage(nextPage);
                serverPagination?.onPageChange(nextPage);
              }}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeSortValue(value: string | number | Date | null | undefined) {
  if (value instanceof Date) {
    return String(value.getTime()).padStart(15, "0");
  }

  if (typeof value === "number") {
    return String(value).padStart(15, "0");
  }

  return String(value ?? "");
}

function toDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59`).getTime();
}
