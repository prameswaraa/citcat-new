import { setRequestLocale } from "next-intl/server"
import { Card } from "@/components/ui/card"
import { ForgotPasswordForm } from "./components/forgot-password-form"

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  
  return (
    <Card className="border-border/50 bg-card/50 p-8 shadow-xl backdrop-blur-sm">
      <ForgotPasswordForm />
    </Card>
  )
}
