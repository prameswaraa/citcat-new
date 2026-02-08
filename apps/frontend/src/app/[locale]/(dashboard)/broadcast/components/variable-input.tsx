"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconVariable, IconAlertCircle } from "@tabler/icons-react"
import type { Template } from "../../templates/data/schema"

interface VariableInputProps {
  template: Template
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

interface VariableInfo {
  key: string
  label: string
  source: "header" | "body" | "button"
  placeholder: string
}

/**
 * Extract variables from template
 * Variables are in format {{1}}, {{2}}, etc.
 */
function extractVariables(template: Template): VariableInfo[] {
  const variables: VariableInfo[] = []
  const variableRegex = /\{\{(\d+)\}\}/g

  // Extract from header (if text type)
  if (template.headerType === "TEXT" && template.headerContent) {
    const matches = template.headerContent.matchAll(variableRegex)
    for (const match of matches) {
      const key = match[1]
      if (!variables.find((v) => v.key === key)) {
        variables.push({
          key,
          label: `Header Variable ${key}`,
          source: "header",
          placeholder: `Value for header {{${key}}}`,
        })
      }
    }
  }

  // Extract from body content
  if (template.content) {
    const matches = template.content.matchAll(variableRegex)
    for (const match of matches) {
      const key = match[1]
      if (!variables.find((v) => v.key === key)) {
        variables.push({
          key,
          label: `Body Variable ${key}`,
          source: "body",
          placeholder: `Value for body {{${key}}}`,
        })
      }
    }
  }

  // Extract from button URLs (dynamic URL suffix)
  if (template.components) {
    for (const component of template.components) {
      if (component.type === "BUTTONS" && component.buttons) {
        for (const button of component.buttons) {
          if (button.type === "URL" && button.example && button.example.length > 0) {
            // Dynamic URL buttons have variables
            button.example.forEach((_, index) => {
              const key = `url_${index + 1}`
              if (!variables.find((v) => v.key === key)) {
                variables.push({
                  key,
                  label: `Button URL Variable ${index + 1}`,
                  source: "button",
                  placeholder: `URL suffix for button`,
                })
              }
            })
          }
        }
      }
    }
  }

  // Sort by key number
  return variables.sort((a, b) => {
    const aNum = parseInt(a.key.replace("url_", ""), 10)
    const bNum = parseInt(b.key.replace("url_", ""), 10)
    return aNum - bNum
  })
}

export function VariableInput({ template, values, onChange }: VariableInputProps) {
  const t = useTranslations("broadcast.variableInput")

  const variables = useMemo(() => extractVariables(template), [template])

  const handleChange = (key: string, value: string) => {
    onChange({
      ...values,
      [key]: value,
    })
  }

  // Check if all required variables are filled
  const missingVariables = useMemo(() => {
    return variables.filter((v) => !values[v.key]?.trim())
  }, [variables, values])

  if (variables.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <IconVariable className="h-5 w-5" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {variables.map((variable) => (
          <div key={variable.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`var-${variable.key}`} className="text-sm">
                {`{{${variable.key}}}`}
              </Label>
              <Badge variant="outline" className="text-xs">
                {variable.source}
              </Badge>
            </div>
            <Input
              id={`var-${variable.key}`}
              value={values[variable.key] || ""}
              onChange={(e) => handleChange(variable.key, e.target.value)}
              placeholder={variable.placeholder}
              className={!values[variable.key]?.trim() ? "border-amber-300" : ""}
            />
          </div>
        ))}

        {/* Validation warning */}
        {missingVariables.length > 0 && (
          <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
            <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {t("required")}: {missingVariables.map((v) => `{{${v.key}}}`).join(", ")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Check if all variables in a template are filled
 */
export function validateVariables(template: Template, values: Record<string, string>): boolean {
  const variables = extractVariables(template)
  return variables.every((v) => values[v.key]?.trim())
}

export default VariableInput
