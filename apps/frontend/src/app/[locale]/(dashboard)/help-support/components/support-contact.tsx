import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Mail, MessageCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useBranding } from "@/hooks/use-branding"

export function SupportContact() {
  const t = useTranslations("helpSupport")
  const { supportEmail, supportWhatsapp } = useBranding()

  // Format WhatsApp number for wa.me link (remove spaces, dashes, and + sign)
  const whatsappLink = `https://wa.me/${supportWhatsapp.replace(/[\s\-+]/g, "")}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("contactSupport")}</CardTitle>
          <CardDescription>
            {t("contactSupportDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold">{t("emailSupport")}</h3>
                <p className="text-sm text-muted-foreground">
                  {supportEmail}
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => window.open(`mailto:${supportEmail}`)}
                >
                  {t("sendEmail")}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold">{t("whatsappSupport")}</h3>
                <p className="text-sm text-muted-foreground">
                  {supportWhatsapp}
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => window.open(whatsappLink)}
                >
                  {t("chatWhatsapp")}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold">{t("operatingHours")}</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{t("mondayFriday")}</p>
                <p>{t("saturday")}</p>
                <p>{t("sundayHoliday")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">{t("beforeContactingSupport")}</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>{t("beforeContactTip1")}</li>
              <li>{t("beforeContactTip2")}</li>
              <li>{t("beforeContactTip3")}</li>
              <li>{t("beforeContactTip4")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
