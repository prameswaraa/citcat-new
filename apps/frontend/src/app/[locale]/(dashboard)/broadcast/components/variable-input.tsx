"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconVariable, IconAlertCircle, IconPhoto, IconVideo, IconFile, IconCopy } from "@tabler/icons-react"
import type { Template } from "../../templates/data/schema"

interface VariableInputProps {
  template: Template
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

interface VariableInfo {
  key: string
  label: string
  source: "header" | "body" | "button" | "header_media" | "copy_code"
  placeholder: string
  inputType?: "text" | "url"
  icon?: React.ReactNode
}

/**
 * Extract variables from template
 * Variables are in format {{1}}, {{2}}, etc.
 */
function extractVariables(template: Template): VariableInfo[] {
  const variables: VariableInfo[] = []
  const variableRegex = /\{\{(\d+)\}\}/g

  // Extract media header (IMAGE, VIDEO, DOCUMENT) - shown first
  if (template.headerType && ["IMAGE", "VIDEO", "DOCUMENT"].includes(template.headerType)) {
    const headerType = template.headerType.toLowerCase()
    const key = `header_${headerType}`
    const icons: Record<string, React.ReactNode> = {
      image: <IconPhoto className="h-4 w-4" />,
      video: <IconVideo className="h-4 w-4" />,
      document: <IconFile className="h-4 w-4" />,
    }
    const labels: Record<string, string> = {
      image: "Header Image URL",
      video: "Header Video URL",
      document: "Header Document URL",
    }
    variables.push({
      key,
      label: labels[headerType] || `Header ${template.headerType}`,
      source: "header_media",
      placeholder: `https://example.com/${headerType}.${headerType === "image" ? "jpg" : headerType === "video" ? "mp4" : "pdf"}`,
      inputType: "url",
      icon: icons[headerType],
    })
  }

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

  // Extract from button URLs (dynamic URL suffix) and Copy Code buttons
  if (template.components) {
    let urlButtonIndex = 0
    for (const component of template.components) {
      if (component.type === "BUTTONS" && component.buttons) {
        for (let btnIndex = 0; btnIndex < component.buttons.length; btnIndex++) {
          const button = component.buttons[btnIndex]
          
          // Dynamic URL buttons have variables - check both example array and url with {{1}}
          const hasDynamicUrl = button.type === "URL" && (
            (button.example && button.example.length > 0) ||
            (button.url && button.url.includes("{{1}}"))
          )
          if (hasDynamicUrl) {
            // Use button_X format to match backend expectation
            const key = `button_${urlButtonIndex}`
            if (!variables.find((v) => v.key === key)) {
              variables.push({
                key,
                label: `Button URL Suffix`,
                source: "button",
                placeholder: `URL suffix for "${button.text}" button`,
              })
            }
            urlButtonIndex++
          }
          
          // Copy Code / OTP buttons
          if (button.type === "COPY_CODE" || button.type === "OTP") {
            const key = `button_${btnIndex}_copy_code`
            if (!variables.find((v) => v.key === key)) {
              variables.push({
                key,
                label: "Copy Code",
                source: "copy_code",
                placeholder: "Enter code (e.g., 123456)",
                icon: <IconCopy className="h-4 w-4" />,
              })
            }
          }
        }
      }
    }
  }
  
  // Also check template.buttons directly (fallback for non-components structure)
  if (template.buttons) {
    let urlButtonIndex = 0
    for (let btnIndex = 0; btnIndex < template.buttons.length; btnIndex++) {
      const button = template.buttons[btnIndex]
      
      // Dynamic URL buttons
      const hasDynamicUrl = button.type === "URL" && (
        (button.example && button.example.length > 0) ||
        (button.url && button.url.includes("{{1}}"))
      )
      if (hasDynamicUrl) {
        const key = `button_${urlButtonIndex}`
        if (!variables.find((v) => v.key === key)) {
          variables.push({
            key,
            label: `Button URL Suffix`,
            source: "button",
            placeholder: `URL suffix for "${button.text}" button`,
          })
        }
        urlButtonIndex++
      }
      
      // Copy Code / OTP buttons
      if (button.type === "COPY_CODE" || button.type === "OTP") {
        const key = `button_${btnIndex}_copy_code`
        if (!variables.find((v) => v.key === key)) {
          variables.push({
            key,
            label: "Copy Code",
            source: "copy_code",
            placeholder: "Enter code (e.g., 123456)",
            icon: <IconCopy className="h-4 w-4" />,
          })
        }
      }
    }
  }

  // Sort: header_media first, then body variables by number, then buttons
  return variables.sort((a, b) => {
    // header_media always first
    if (a.source === "header_media" && b.source !== "header_media") return -1
    if (b.source === "header_media" && a.source !== "header_media") return 1
    
    // then header text variables
    if (a.source === "header" && b.source !== "header" && b.source !== "header_media") return -1
    if (b.source === "header" && a.source !== "header" && a.source !== "header_media") return 1
    
    // then body variables sorted by number
    if (a.source === "body" && b.source === "body") {
      return parseInt(a.key, 10) - parseInt(b.key, 10)
    }
    
    // body before buttons
    if (a.source === "body" && (b.source === "button" || b.source === "copy_code")) return -1
    if (b.source === "body" && (a.source === "button" || a.source === "copy_code")) return 1
    
    // buttons and copy_code last
    return 0
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
              {variable.icon && <span className="text-muted-foreground">{variable.icon}</span>}
              <Label htmlFor={`var-${variable.key}`} className="text-sm">
                {variable.source === "header_media" || variable.source === "copy_code"
                  ? variable.label
                  : `{{${variable.key}}}`}
              </Label>
              <Badge variant="outline" className="text-xs">
                {variable.source === "header_media" ? "header" : variable.source === "copy_code" ? "button" : variable.source}
              </Badge>
            </div>
            <Input
              id={`var-${variable.key}`}
              type={variable.inputType === "url" ? "url" : "text"}
              value={values[variable.key] || ""}
              onChange={(e) => handleChange(variable.key, e.target.value)}
              placeholder={variable.placeholder}
              className={!values[variable.key]?.trim() ? "border-amber-300" : ""}
            />
            {variable.source === "header_media" && (
              <p className="text-xs text-muted-foreground">
                Enter a publicly accessible URL for the {variable.key.replace("header_", "")}
              </p>
            )}
            {variable.source === "copy_code" && (
              <p className="text-xs text-muted-foreground">
                This code will be copied when user taps the button
              </p>
            )}
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
