"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { BackButton } from "../back-button"

export default function ForbiddenError() {
  const t = useTranslations("errors")
  const tCommon = useTranslations("common")
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">403</h1>
        <span className="font-medium">{t("unauthorized")}</span>
        <p className="text-muted-foreground text-center">
          {t("tryAgainOrGoHome")}
        </p>
        <div className="mt-6 flex gap-4">
          <BackButton />
          <Button asChild>
            <Link href="/">{tCommon("goHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
