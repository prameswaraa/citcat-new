"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { BackButton } from "../back-button"
import { Button } from "../ui/button"

export default function UnauthorizedError() {
  const t = useTranslations("errors")
  const tAuth = useTranslations("auth")
  const tCommon = useTranslations("common")
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">401</h1>
        <span className="font-medium">{t("unauthorized")}</span>
        <p className="text-muted-foreground text-center">
          {t("tryAgainOrGoHome")}
        </p>
        <div className="mt-6 flex gap-4">
          <BackButton />
          <Button asChild>
            <Link href="/login">{tAuth("login")}</Link>
          </Button>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/">{tCommon("goHome")}</Link>
        </Button>
      </div>
    </div>
  )
}
