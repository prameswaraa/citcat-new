"use client"

import { format } from "date-fns"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "../../components/data-table-column-header"
import type { WebhookDeliveryLog } from "@/lib/api/webhooks-api"
import { WebhookStatusIcon } from "./webhook-status-icon"

export const columns: ColumnDef<WebhookDeliveryLog>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => {
      const { createdAt } = row.original
      return <div>{format(new Date(createdAt), "dd MMM, yyyy h:mma")}</div>
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "eventType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Event" />
    ),
    cell: ({ row }) => {
      const { status } = row.original
      return (
        <div className="flex items-center gap-1.5">
          <WebhookStatusIcon status={status === "success"} />
          <span className="font-mono text-sm">{row.getValue("eventType")}</span>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const { status, responseStatus } = row.original
      return (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              status === "success"
                ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : status === "failed"
                ? "border-red-300 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                : "border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
            }
          >
            {status}
          </Badge>
          {responseStatus && (
            <span className="text-muted-foreground text-xs font-mono">
              {responseStatus}
            </span>
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "latencyMs",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Latency" />
    ),
    cell: ({ row }) => {
      const { latencyMs } = row.original
      return latencyMs ? (
        <span className="font-mono text-sm">{latencyMs}ms</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "attemptNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Attempt" />
    ),
    cell: ({ row }) => {
      const { attemptNumber } = row.original
      return <span className="text-sm">{attemptNumber}</span>
    },
    enableSorting: false,
    enableHiding: false,
  },
]
