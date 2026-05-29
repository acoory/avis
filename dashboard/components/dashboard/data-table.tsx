"use client";

import { ReactNode, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
  minWidth?: number;
  dateFilter?: {
    label: string;
    getValue: (row: T) => string | Date | null | undefined;
    mode?: "client" | "server";
    onChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
  };
};

const pageSizeOptions = [10, 25, 50, 100];

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "Aucune donnee.",
  minWidth = 760,
  dateFilter,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(columns[0]?.id ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const fromTime = dateFrom ? startOfDay(dateFrom) : null;
    const toTime = dateTo ? endOfDay(dateTo) : null;

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
  }, [columns, data, dateFilter, dateFrom, dateTo, search]);

  const sortedData = useMemo(() => {
    const column = columns.find((item) => item.id === sortColumn);
    if (!column?.sortValue) {
      return filteredData;
    }

    return [...filteredData].sort((firstRow, secondRow) => {
      const firstValue = normalizeSortValue(column.sortValue?.(firstRow));
      const secondValue = normalizeSortValue(column.sortValue?.(secondRow));
      const result = firstValue.localeCompare(secondValue, "fr", { numeric: true, sensitivity: "base" });

      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, filteredData, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = sortedData.length ? (safePage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * pageSize, sortedData.length);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) {
      return;
    }

    setPage(1);
    if (sortColumn === column.id) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column.id);
    setSortDirection("asc");
  }

  function updatePageSize(value: string) {
    setPageSize(Number(value));
    setPage(1);
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Rechercher"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {dateFilter ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    {dateFilter.label} debut
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      const nextDateFrom = event.target.value;
                      setDateFrom(nextDateFrom);
                      setPage(1);
                      dateFilter.onChange?.({
                        dateFrom: nextDateFrom || undefined,
                        dateTo: dateTo || undefined,
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
                    value={dateTo}
                    onChange={(event) => {
                      const nextDateTo = event.target.value;
                      setDateTo(nextDateTo);
                      setPage(1);
                      dateFilter.onChange?.({
                        dateFrom: dateFrom || undefined,
                        dateTo: nextDateTo || undefined,
                      });
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Lignes</label>
              <select
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
                value={pageSize}
                onChange={(event) => updatePageSize(event.target.value)}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
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
              {visibleRows.map((row, rowIndex) => (
                <tr className="hover:bg-gray-50" key={rowIndex}>
                  {columns.map((column) => (
                    <td className={column.className ?? "px-4 py-3 text-gray-600"} key={column.id}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {!visibleRows.length ? (
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
          <span>
            {rangeStart}-{rangeEnd} sur {sortedData.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              disabled={safePage <= 1}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedent
            </Button>
            <span className="min-w-20 text-center">
              Page {safePage} / {totalPages}
            </span>
            <Button
              disabled={safePage >= totalPages}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
