"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export default function MaintenanceError() {
  const t = useTranslations("errors")
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">503</h1>
        <span className="font-medium">{t("appError")}</span>
        <p className="text-muted-foreground text-center">
          {t("appErrorDesc")}
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("reload")}
          </Button>
        </div>
      </div>
    </div>
  )
}
