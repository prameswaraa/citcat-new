"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Loader2, UserPlus, Link2 } from "lucide-react"

interface CustomerSearchResult {
  id: string
  name: string | null
  phoneNumber: string
  email: string | null
}

interface LinkCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectCustomer: (customerId: string) => Promise<void>
  onCreateCustomer?: () => void
}

export function LinkCustomerDialog({
  open,
  onOpenChange,
  onSelectCustomer,
  onCreateCustomer,
}: LinkCustomerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  // Debounced search
  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
    setLoading(true)
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/customers?search=${encodeURIComponent(query)}`,
        { credentials: "include" }
      )
      if (!response.ok) throw new Error("Search failed")
      const result = await response.json()
      setResults(result.data || [])
    } catch (error) {
      console.error("Failed to search customers:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchCustomers])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setResults([])
      setLinking(null)
    }
  }, [open])

  const handleSelectCustomer = async (customerId: string) => {
    setLinking(customerId)
    try {
      await onSelectCustomer(customerId)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to link customer:", error)
    } finally {
      setLinking(null)
    }
  }

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    }
    return phone.replace(/[^0-9]/g, "").substring(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link to Customer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[250px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchQuery.trim() && results.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No customers found for "{searchQuery}"
                </p>
                {onCreateCustomer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCreateCustomer()
                      onOpenChange(false)
                    }}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create New Customer
                  </Button>
                )}
              </div>
            ) : !searchQuery.trim() ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Start typing to search customers
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer.id)}
                    disabled={linking !== null}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left disabled:opacity-50"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(customer.name, customer.phoneNumber)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {customer.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.phoneNumber}
                        {customer.email && ` • ${customer.email}`}
                      </p>
                    </div>
                    {linking === customer.id && (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Create new customer option */}
          {onCreateCustomer && searchQuery.trim() && results.length > 0 && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCreateCustomer()
                  onOpenChange(false)
                }}
                className="w-full gap-2 text-muted-foreground"
              >
                <UserPlus className="h-4 w-4" />
                Create New Customer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
