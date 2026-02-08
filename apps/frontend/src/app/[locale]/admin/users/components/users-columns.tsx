"use client"

import { format } from "date-fns"
import { ColumnDef } from "@tanstack/react-table"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions, AdminUser, Role } from "./data-table-row-actions"

const statusColors: Record<string, string> = {
  active: "bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200",
  inactive: "bg-neutral-300/40 border-neutral-300",
}

const roleColors: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  BUSINESS_OWNER: "bg-blue-100 text-blue-800 border-blue-200",
  AGENT: "bg-gray-100 text-gray-800 border-gray-200",
}

const tierColors: Record<string, string> = {
  PRO: "bg-purple-100 text-purple-800 border-purple-200",
  LITE: "bg-blue-100 text-blue-800 border-blue-200",
  FREE: "bg-gray-100 text-gray-800 border-gray-200",
}

export const createColumns = (
  onActivate?: (user: AdminUser) => void,
  onDeactivate?: (user: AdminUser) => void
): ColumnDef<AdminUser>[] => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      meta: {
        className: cn(
          "sticky md:table-cell left-0 z-10 rounded-tl",
          "bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted pr-2! md:pr-0"
        ),
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        return (
          <Button variant="link" className="underline p-0 h-auto" asChild>
            <Link href={`/admin/users/${row.original.id}`}>
              {row.getValue("name")}
            </Link>
          </Button>
        )
      },
      meta: { className: "w-36" },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <div className="w-fit text-nowrap">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const role = row.getValue("role") as Role
        return (
          <Badge variant="outline" className={cn("capitalize", roleColors[role])}>
            {role.replace("_", " ")}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: "subscriptionTier",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tier" />
      ),
      cell: ({ row }) => {
        const tier = row.getValue("subscriptionTier") as string
        return (
          <Badge variant="outline" className={cn(tierColors[tier])}>
            {tier}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      accessorFn: (row) => (row.isActive ? "active" : "inactive"),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.original.isActive
        const status = isActive ? "active" : "inactive"
        return (
          <Badge variant="outline" className={cn("capitalize", statusColors[status])}>
            {status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="w-fit text-nowrap">
            {date ? format(new Date(date), "dd MMM, yyyy") : "-"}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "lastLoginAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Login" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("lastLoginAt") as string | null
        return (
          <div className="w-fit text-nowrap">
            {date ? format(new Date(date), "dd MMM, yyyy") : "-"}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
        />
      ),
    },
  ]
