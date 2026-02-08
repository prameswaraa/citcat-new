"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconBrandWhatsapp, IconShieldCheck, IconCertificate, IconCircleCheck } from "@tabler/icons-react"
import { WABAConnectionButton } from "@/components/waba/waba-connection-button"
import { useTranslations } from "next-intl"

interface Props {
  hasWABA: boolean
  onSuccess?: () => void
}

export function EmbeddedSignupCard({ hasWABA, onSuccess }: Props) {
  const t = useTranslations("waba")

  if (hasWABA) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
              <IconBrandWhatsapp className="h-5 w-5 text-emerald-600" />
              {t("connectedTitle")}
            </CardTitle>
            <Badge variant="outline" className="border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <IconShieldCheck className="mr-1 h-3 w-3" />
              {t("officialApi.badge")}
            </Badge>
          </div>
          <CardDescription className="text-emerald-700 dark:text-emerald-300">
            {t("connectedDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-800 dark:text-emerald-200 text-sm">
            {t("connectedInfo")}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <IconBrandWhatsapp className="h-5 w-5 text-emerald-600" />
            {t("connectTitle")}
          </CardTitle>
          <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <IconShieldCheck className="mr-1 h-3 w-3" />
            {t("officialApi.badge")}
          </Badge>
        </div>
        <CardDescription>
          {t("connectDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Official API Info Banner */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/50">
              <IconShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-emerald-900 dark:text-emerald-100 text-sm">
                {t("officialApi.title")}
              </h4>
              <p className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">
                {t("officialApi.description")}
              </p>
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <IconCertificate className="h-3.5 w-3.5" />
                  <span>{t("officialApi.benefits.official")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <IconCircleCheck className="h-3.5 w-3.5" />
                  <span>{t("officialApi.benefits.compliant")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            {t("connectIntro")}
          </p>
          <ul className="text-muted-foreground ml-6 list-disc space-y-1 text-sm">
            <li>{t("features.sendReceive")}</li>
            <li>{t("features.templates")}</li>
            <li>{t("features.conversations")}</li>
            <li>{t("features.quality")}</li>
          </ul>
        </div>

        <WABAConnectionButton
          onSuccess={(waba) => {
            if (onSuccess) {
              onSuccess()
            }
          }}
          onError={(error) => {
            console.error("WABA connection error:", error)
          }}
          enableCoexistence={true}
          className="w-full"
        >
          <IconBrandWhatsapp className="mr-2 h-5 w-5" />
          {t("connectButton")}
        </WABAConnectionButton>

        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-muted-foreground text-xs">
            <strong>Note:</strong> {t("note")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
