"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, Lightbulb, ShieldAlert } from "lucide-react"
import { Header } from "@/components/layout/header"
import { useTranslations } from "next-intl"

import { SupportContact } from "./components/support-contact"
import { UsageTips } from "./components/usage-tips"
import { AntiBannedTips } from "./components/anti-banned-tips"

export default function HelpSupportPage() {
  const t = useTranslations("helpSupport")

  return (
    <>
      <Header />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Phone className="h-7 w-7" />
            {t("title")}
          </h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <Tabs defaultValue="support" className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList>
              <TabsTrigger value="support" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t("contactSupport")}
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                {t("usageTips")}
              </TabsTrigger>
              <TabsTrigger value="anti-banned" className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                {t("policyCompliance")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="support" className="space-y-6">
            <SupportContact />
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <UsageTips />
          </TabsContent>

          <TabsContent value="anti-banned" className="space-y-6">
            <AntiBannedTips />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
