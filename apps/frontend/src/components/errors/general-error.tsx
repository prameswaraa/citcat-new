"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  minimal?: boolean
}

export default function GeneralError({ className, minimal = false }: Props) {
  const t = useTranslations("errors")
  const tCommon = useTranslations("common")
  return (
    <div className={cn("h-svh w-full", className)}>
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        {!minimal && (
          <h1 className="text-[7rem] leading-tight font-bold">500</h1>
        )}
        <span className="font-medium">{t("generic")}</span>
        <p className="text-muted-foreground text-center">
          {t("unexpectedError")} <br /> {t("tryAgainOrGoHome")}
        </p>
        {!minimal && (
          <div className="mt-6 flex gap-4">
            <BackButton />
            <Button asChild>
              <Link href="/">{tCommon("goHome")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
