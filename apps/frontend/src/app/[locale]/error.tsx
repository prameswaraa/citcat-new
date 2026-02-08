"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Home, RotateCcw } from "lucide-react"

import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { ErrorMascot } from "@/components/mascot"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  // Log error untuk monitoring/debugging
  useEffect(() => {
    // Log ke console (bisa diganti dengan error tracking service seperti Sentry)
    console.error("[App Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        {/* Mascot */}
        <ErrorMascot size={140} className="mb-4" />

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground">
          Terjadi Kesalahan
        </h1>

        {/* Description */}
        <p className="mt-2 text-muted-foreground">
          Mohon maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi
          atau kembali ke halaman sebelumnya.
        </p>

        {/* Error Digest (untuk debugging) */}
        {error.digest && process.env.NODE_ENV === "development" && (
          <div className="mt-4 rounded-md bg-muted px-3 py-2">
            <code className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Coba Lagi
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
