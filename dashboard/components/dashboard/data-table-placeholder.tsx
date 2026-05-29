import { Card, CardContent } from "@/components/ui/card";

type DataTablePlaceholderProps = {
  title: string;
  columns: string[];
};

export function DataTablePlaceholder({ title, columns }: DataTablePlaceholderProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={columns.length}>
                  Donnees a connecter dans une prochaine phase.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
