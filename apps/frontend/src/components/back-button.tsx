"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { Button, type ButtonProps } from "./ui/button"

export function BackButton({
  variant = "outline",
  children,
  ...props
}: ButtonProps) {
  const router = useRouter()
  const t = useTranslations("common")
  return (
    <Button variant={variant} onClick={() => router.back()} {...props}>
      {children ?? t("back")}
    </Button>
  )
}
