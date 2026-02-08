import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Lightbulb, CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"

export function UsageTips() {
  const t = useTranslations("helpSupport")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("usageTipsTitle")}
          </CardTitle>
          <CardDescription>
            {t("usageTipsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="setup">
              <AccordionTrigger className="text-left">
                {t("setupTitle")}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("setupTip1Title")}</p>
                    <p className="text-sm">{t("setupTip1Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("setupTip2Title")}</p>
                    <p className="text-sm">{t("setupTip2Desc")}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="templates">
              <AccordionTrigger className="text-left">
                {t("templatesTitle")}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("templatesTip1Title")}</p>
                    <p className="text-sm">{t("templatesTip1Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("templatesTip2Title")}</p>
                    <p className="text-sm">{t("templatesTip2Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("templatesTip3Title")}</p>
                    <p className="text-sm">{t("templatesTip3Desc")}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="messaging">
              <AccordionTrigger className="text-left">
                {t("messagingTitle")}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("messagingTip1Title")}</p>
                    <p className="text-sm">{t("messagingTip1Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("messagingTip2Title")}</p>
                    <p className="text-sm">{t("messagingTip2Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("messagingTip3Title")}</p>
                    <p className="text-sm">{t("messagingTip3Desc")}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quality">
              <AccordionTrigger className="text-left">
                {t("qualityTitle")}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("qualityTip1Title")}</p>
                    <p className="text-sm">{t("qualityTip1Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("qualityTip2Title")}</p>
                    <p className="text-sm">{t("qualityTip2Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("qualityTip3Title")}</p>
                    <p className="text-sm">{t("qualityTip3Desc")}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai">
              <AccordionTrigger className="text-left">
                {t("aiTitle")}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("aiTip1Title")}</p>
                    <p className="text-sm">{t("aiTip1Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("aiTip2Title")}</p>
                    <p className="text-sm">{t("aiTip2Desc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t("aiTip3Title")}</p>
                    <p className="text-sm">{t("aiTip3Desc")}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
