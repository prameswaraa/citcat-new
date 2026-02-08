import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import {
    Paperclip,
    Send,
    Plus,
    FileText,
    Link,
    List,
    ListOrdered,
    X,
    FileIcon,
    AlertCircle,
    Trash2
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { WindowStatus } from "@/lib/window-utils"

// Separate component to avoid closure issues with state
function VariableInputForm({ 
    template, 
    variableValues, 
    onVariableChange 
}: { 
    template: any
    variableValues: Record<string, string>
    onVariableChange: (varNum: string, value: string) => void 
}) {
    const content = template.content || template.bodyText || ''
    const matches = content.match(/\{\{(\d+)\}\}/g) || []
    const uniqueVars: string[] = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ''))))
    
    
    // Generate preview
    let preview = content
    Object.entries(variableValues).forEach(([num, value]) => {
        preview = preview.replace(new RegExp(`\\{\\{${num}\\}\\}`, 'g'), value || `{{${num}}}`)
    })

    return (
        <div className="space-y-4 py-4">
            {/* Show template preview */}
            <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Template: {template.templateName}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {content}
                </p>
            </div>

            {/* Variable inputs */}
            {uniqueVars.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                    No variables detected in template content.
                </div>
            ) : (
                uniqueVars.map((varNum) => (
                    <div key={varNum} className="space-y-2">
                        <Label>Variable {varNum}</Label>
                        <Input
                            placeholder={`Enter value for {{${varNum}}}`}
                            value={variableValues[varNum] || ''}
                            onChange={(e) => onVariableChange(varNum, e.target.value)}
                        />
                    </div>
                ))
            )}

            {/* Preview with values */}
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                <p className="text-xs font-medium mb-2 text-primary">Preview:</p>
                <p className="text-sm whitespace-pre-wrap">{preview}</p>
            </div>
        </div>
    )
}

interface MessageInputProps {
    onSendMessage: (text: string) => Promise<any>
    onSendTemplate: (template: any) => Promise<any>
    onSendCta: (data: any) => Promise<any>
    onSendReplyButtons: (data: any) => Promise<any>
    onSendListMessage: (data: any) => Promise<any>
    onSendMedia: (file: File, caption?: string) => Promise<any>
    sending: boolean
    uploading: boolean
    templates: any[]
    windowStatus?: WindowStatus | null
    customerId?: string
}

export function MessageInput({
    onSendMessage,
    onSendTemplate,
    onSendCta,
    onSendReplyButtons,
    onSendListMessage,
    onSendMedia,
    sending,
    uploading,
    templates,
    windowStatus,
    customerId
}: MessageInputProps) {
    const t = useTranslations('common')
    const [messageText, setMessageText] = useState("")
    const [showTemplateMenu, setShowTemplateMenu] = useState(false)
    const [showCtaDialog, setShowCtaDialog] = useState(false)
    const [showReplyDialog, setShowReplyDialog] = useState(false)
    const [showListDialog, setShowListDialog] = useState(false)
    const [showVariableDialog, setShowVariableDialog] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [variableValues, setVariableValues] = useState<Record<string, string>>({})
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Typing indicator - sends to customer when agent types
    const { sendTyping } = useTypingIndicator(customerId, "whatsapp")

    // Auto-focus on textarea when conversation changes or component mounts
    useEffect(() => {
        const isWindowActive = windowStatus?.isActive !== false || windowStatus === null
        const isNotDisabled = !sending && !uploading
        
        if (isWindowActive && isNotDisabled) {
            // Use requestAnimationFrame for more reliable focus after render
            requestAnimationFrame(() => {
                textareaRef.current?.focus()
            })
        }
    }, [customerId]) // Only trigger on conversation change

    // Re-focus when window becomes active
    useEffect(() => {
        if (windowStatus?.isActive === true) {
            requestAnimationFrame(() => {
                textareaRef.current?.focus()
            })
        }
    }, [windowStatus?.isActive])

    // CTA Form State
    const [ctaForm, setCtaForm] = useState({
        bodyText: "",
        buttonLabel: "",
        buttonUrl: "",
        footerText: "",
        headerImageUrl: ""
    })

    // Reply Buttons Form State
    const [replyForm, setReplyForm] = useState<{
        bodyText: string
        buttons: { id: string; title: string }[]
        footerText: string
        headerImage: File | null
    }>({
        bodyText: "",
        buttons: [{ id: "btn-1", title: "" }],
        footerText: "",
        headerImage: null
    })

    // List Message Form State
    const [listForm, setListForm] = useState<{
        headerText: string
        bodyText: string
        footerText: string
        buttonText: string
        sections: Array<{
            title: string
            rows: Array<{
                id: string
                title: string
                description: string
            }>
        }>
    }>({
        headerText: "",
        bodyText: "",
        footerText: "",
        buttonText: "",
        sections: [{
            title: "",
            rows: [{ id: "row-1", title: "", description: "" }]
        }]
    })

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedFile) {
            await onSendMedia(selectedFile, messageText)
            handleCancelFile()
            setMessageText("")
            // Refocus after sending
            setTimeout(() => textareaRef.current?.focus(), 0)
        } else if (messageText.trim()) {
            const success = await onSendMessage(messageText)
            if (success === true) {
                setMessageText("")
                // Refocus after sending
                setTimeout(() => textareaRef.current?.focus(), 0)
            } else if (success === "WINDOW_EXPIRED") {
                setShowTemplateMenu(true)
            }
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Check file size (max 16MB for WhatsApp)
        if (file.size > 16 * 1024 * 1024) {
            // Ideally show toast here, but we can rely on parent or just ignore
            return
        }

        setSelectedFile(file)

        // Create preview for images
        if (file.type.startsWith("image/")) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFilePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } else {
            setFilePreview(null)
        }
    }

    const handleCancelFile = () => {
        setSelectedFile(null)
        setFilePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <div className="p-4 bg-background border-t">
            {/* Window Closed Warning */}
            {windowStatus && !windowStatus.isActive && (
                <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                        24-hour window expired. You can only send <button
                            onClick={() => setShowTemplateMenu(true)}
                            className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100"
                        >
                            message templates
                        </button>.
                    </AlertDescription>
                </Alert>
            )}

            {/* File Preview */}
            {selectedFile && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-start gap-3 relative group">
                    <button
                        onClick={handleCancelFile}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="h-3 w-3" />
                    </button>

                    {filePreview ? (
                        <img
                            src={filePreview}
                            alt="Preview"
                            className="h-16 w-16 object-cover rounded-md border"
                        />
                    ) : (
                        <div className="h-16 w-16 bg-background rounded-md border flex items-center justify-center">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                {/* Attachments Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                            disabled={!windowStatus?.isActive && windowStatus !== null}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Attachments</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {windowStatus?.isActive !== false && (
                            <>
                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="mr-2 h-4 w-4" />
                                    <span>File / Image</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowCtaDialog(true)}>
                                    <Link className="mr-2 h-4 w-4" />
                                    <span>CTA Link Button</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowReplyDialog(true)}>
                                    <List className="mr-2 h-4 w-4" />
                                    <span>Reply Buttons</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowListDialog(true)}>
                                    <ListOrdered className="mr-2 h-4 w-4" />
                                    <span>List Message</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onClick={() => setShowTemplateMenu(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Template Message</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <Textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={(e) => {
                        setMessageText(e.target.value)
                        // Send typing indicator to customer (debounced, fire-and-forget)
                        if (e.target.value.trim()) {
                            sendTyping()
                        }
                    }}
                    onKeyDown={(e) => {
                        // Enter without Shift sends the message
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            if ((messageText.trim() || selectedFile) && !sending && !uploading) {
                                handleSendMessage(e)
                            }
                        }
                        // Shift+Enter allows new line (default behavior)
                    }}
                    placeholder={
                        !windowStatus?.isActive && windowStatus !== null
                            ? "Use a template to message..."
                            : selectedFile
                                ? "Add a caption..."
                                : "Type a message..."
                    }
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none py-3"
                    rows={1}
                    disabled={sending || uploading || (!windowStatus?.isActive && windowStatus !== null)}
                    autoFocus
                />

                <Button
                    type="submit"
                    size="icon"
                    disabled={(!messageText.trim() && !selectedFile) || sending || uploading || (!windowStatus?.isActive && windowStatus !== null)}
                    className={sending || uploading ? "opacity-70" : ""}
                >
                    <Send className="h-5 w-5" />
                </Button>
            </form>

            {/* Template Selection Dialog */}
            <Dialog open={showTemplateMenu} onOpenChange={setShowTemplateMenu}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Select Template</DialogTitle>
                        <DialogDescription>
                            Choose a template to send to the customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {templates.map((template) => {
                            // Check if template has variables - use backend-provided flag or check content
                            const templateContent = template.content || template.bodyText || ''
                            const hasVariables = template.hasVariables || templateContent.match(/\{\{(\d+)\}\}/g)
                            
                            return (
                                <div
                                    key={template.id}
                                    className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => {
                                        if (hasVariables) {
                                            // Show variable input dialog
                                            setSelectedTemplate(template)
                                            setShowTemplateMenu(false)
                                            setShowVariableDialog(true)
                                        } else {
                                            // Send directly
                                            onSendTemplate(template)
                                            setShowTemplateMenu(false)
                                        }
                                    }}
                                >
                                    <h4 className="font-semibold mb-2">{template.templateName}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {template.content || template.bodyText}
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                            {template.language}
                                        </span>
                                        <span className="text-xs bg-muted px-2 py-1 rounded">
                                            {template.category}
                                        </span>
                                        {hasVariables && (
                                            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-2 py-1 rounded flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                Variables
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Variable Input Dialog */}
            <Dialog open={showVariableDialog} onOpenChange={(open) => {
                setShowVariableDialog(open)
                // Reset state when dialog closes
                if (!open) {
                    setVariableValues({})
                    setSelectedTemplate(null)
                }
            }}>
                <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Fill Template Variables</DialogTitle>
                        <DialogDescription>
                            Enter values for the template variables before sending.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {selectedTemplate && (
                            <VariableInputForm
                                key={selectedTemplate.id || selectedTemplate.templateName} // Force re-render on template change
                                template={selectedTemplate}
                                variableValues={variableValues}
                                onVariableChange={(varNum, value) => {
                                    setVariableValues(prev => ({
                                        ...prev,
                                        [varNum]: value
                                    }))
                                }}
                            />
                        )}
                    </div>
                    <DialogFooter className="flex-shrink-0">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowVariableDialog(false)
                                setVariableValues({})
                                setSelectedTemplate(null)
                            }}
                        >
                            {t('cancel')}
                        </Button>
                        <Button 
                            onClick={() => {
                                // Get required variables from template
                                const content = selectedTemplate?.content || selectedTemplate?.bodyText || ''
                                const matches = content.match(/\{\{(\d+)\}\}/g) || []
                                const requiredVars: string[] = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ''))))
                                
                                // Check if all variables are filled
                                const missingVars = requiredVars.filter((v) => !variableValues[v]?.trim())
                                
                                // Build components directly here to ensure they're sent
                                // IMPORTANT: Parameters MUST be in order ({{1}}, {{2}}, {{3}}) for WhatsApp API
                                let components: any[] | undefined = undefined
                                if (requiredVars.length > 0) {
                                    // Sort by variable number to ensure correct order
                                    const sortedVars = [...requiredVars].sort((a, b) => parseInt(a) - parseInt(b))
                                    
                                    // Build parameters - ALL variables must be included, even if empty
                                    // WhatsApp API requires exact parameter count matching template
                                    const bodyParameters = sortedVars.map(v => ({
                                        type: "text",
                                        text: variableValues[v]?.trim() || '' // Use empty string if not filled
                                    }))
                                    
                                    // Only add components if we have parameters
                                    if (bodyParameters.length > 0) {
                                        components = [{
                                            type: "body",
                                            parameters: bodyParameters
                                        }]
                                    }
                                    
                                }
                                
                                // Send with both variableValues AND pre-built components
                                onSendTemplate({ ...selectedTemplate, variableValues, components })
                                setShowVariableDialog(false)
                                setVariableValues({})
                                setSelectedTemplate(null)
                            }}
                            disabled={sending}
                        >
                            Send Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CTA Dialog */}
            <Dialog open={showCtaDialog} onOpenChange={setShowCtaDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send CTA Message</DialogTitle>
                        <DialogDescription>
                            Send a message with a Call-to-Action button.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Header Image URL (Optional)</Label>
                            <Input
                                placeholder="https://example.com/image.jpg"
                                value={ctaForm.headerImageUrl}
                                onChange={e => setCtaForm({ ...ctaForm, headerImageUrl: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Body Text</Label>
                            <Textarea
                                placeholder="Enter your message..."
                                value={ctaForm.bodyText}
                                onChange={e => setCtaForm({ ...ctaForm, bodyText: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Footer Text (Optional)</Label>
                            <Input
                                placeholder="Footer text"
                                value={ctaForm.footerText}
                                onChange={e => setCtaForm({ ...ctaForm, footerText: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Button Label</Label>
                                <Input
                                    placeholder="Visit Website"
                                    value={ctaForm.buttonLabel}
                                    onChange={e => setCtaForm({ ...ctaForm, buttonLabel: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Button URL</Label>
                                <Input
                                    placeholder="https://..."
                                    value={ctaForm.buttonUrl}
                                    onChange={e => setCtaForm({ ...ctaForm, buttonUrl: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCtaDialog(false)}>{t('cancel')}</Button>
                        <Button onClick={() => {
                            onSendCta(ctaForm)
                            setShowCtaDialog(false)
                        }} disabled={sending}>Send Message</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reply Buttons Dialog */}
            <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Reply Buttons</DialogTitle>
                        <DialogDescription>
                            Send a message with up to 3 quick reply buttons.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Header Image (Optional)</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={e => setReplyForm({ ...replyForm, headerImage: e.target.files?.[0] || null })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Body Text</Label>
                            <Textarea
                                placeholder="Enter your message..."
                                value={replyForm.bodyText}
                                onChange={e => setReplyForm({ ...replyForm, bodyText: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Footer Text (Optional)</Label>
                            <Input
                                placeholder="Footer text"
                                value={replyForm.footerText}
                                onChange={e => setReplyForm({ ...replyForm, footerText: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Buttons (Max 3)</Label>
                            {replyForm.buttons.map((btn, idx) => (
                                <div key={btn.id} className="flex gap-2">
                                    <Input
                                        placeholder={`Button ${idx + 1}`}
                                        value={btn.title}
                                        onChange={e => {
                                            const newButtons = [...replyForm.buttons]
                                            newButtons[idx].title = e.target.value
                                            setReplyForm({ ...replyForm, buttons: newButtons })
                                        }}
                                    />
                                    {idx > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                const newButtons = replyForm.buttons.filter((_, i) => i !== idx)
                                                setReplyForm({ ...replyForm, buttons: newButtons })
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {replyForm.buttons.length < 3 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReplyForm({
                                        ...replyForm,
                                        buttons: [...replyForm.buttons, { id: `btn-${replyForm.buttons.length + 1}`, title: "" }]
                                    })}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Button
                                </Button>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReplyDialog(false)}>{t('cancel')}</Button>
                        <Button onClick={() => {
                            onSendReplyButtons(replyForm)
                            setShowReplyDialog(false)
                        }} disabled={sending}>Send Message</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* List Message Dialog */}
            <Dialog open={showListDialog} onOpenChange={(open) => {
                setShowListDialog(open)
                if (!open) {
                    // Reset form when closing
                    setListForm({
                        headerText: "",
                        bodyText: "",
                        footerText: "",
                        buttonText: "",
                        sections: [{
                            title: "",
                            rows: [{ id: "row-1", title: "", description: "" }]
                        }]
                    })
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Send List Message</DialogTitle>
                        <DialogDescription>
                            Create an interactive list for customers to choose from. Max 10 sections, 10 rows per section.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Header Text (Optional, max 60 chars)</Label>
                            <Input
                                placeholder="Header text"
                                value={listForm.headerText}
                                maxLength={60}
                                onChange={e => setListForm({ ...listForm, headerText: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Body Text (Required, max 1024 chars)</Label>
                            <Textarea
                                placeholder="Enter your message..."
                                value={listForm.bodyText}
                                maxLength={1024}
                                onChange={e => setListForm({ ...listForm, bodyText: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Footer Text (Optional, max 60 chars)</Label>
                            <Input
                                placeholder="Footer text"
                                value={listForm.footerText}
                                maxLength={60}
                                onChange={e => setListForm({ ...listForm, footerText: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Button Text (Required, max 20 chars)</Label>
                            <Input
                                placeholder="View Options"
                                value={listForm.buttonText}
                                maxLength={20}
                                onChange={e => setListForm({ ...listForm, buttonText: e.target.value })}
                            />
                        </div>

                        {/* Sections */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Sections</Label>
                                {listForm.sections.length < 10 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setListForm({
                                            ...listForm,
                                            sections: [...listForm.sections, {
                                                title: "",
                                                rows: [{ id: `row-${Date.now()}`, title: "", description: "" }]
                                            }]
                                        })}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Add Section
                                    </Button>
                                )}
                            </div>

                            {listForm.sections.map((section, sectionIdx) => (
                                <div key={sectionIdx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-medium">Section {sectionIdx + 1}</Label>
                                        {listForm.sections.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    const newSections = listForm.sections.filter((_, i) => i !== sectionIdx)
                                                    setListForm({ ...listForm, sections: newSections })
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm text-muted-foreground">
                                            Section Title {listForm.sections.length > 1 ? "(Required)" : "(Optional)"} - max 24 chars
                                        </Label>
                                        <Input
                                            placeholder="Section title"
                                            value={section.title}
                                            maxLength={24}
                                            onChange={e => {
                                                const newSections = [...listForm.sections]
                                                newSections[sectionIdx].title = e.target.value
                                                setListForm({ ...listForm, sections: newSections })
                                            }}
                                        />
                                    </div>

                                    {/* Rows */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm text-muted-foreground">Rows</Label>
                                            {section.rows.length < 10 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newSections = [...listForm.sections]
                                                        newSections[sectionIdx].rows.push({
                                                            id: `row-${Date.now()}`,
                                                            title: "",
                                                            description: ""
                                                        })
                                                        setListForm({ ...listForm, sections: newSections })
                                                    }}
                                                >
                                                    <Plus className="mr-1 h-3 w-3" /> Add Row
                                                </Button>
                                            )}
                                        </div>

                                        {section.rows.map((row, rowIdx) => (
                                            <div key={row.id} className="flex gap-2 items-start bg-background p-2 rounded border">
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        placeholder="Row title (max 24 chars)"
                                                        value={row.title}
                                                        maxLength={24}
                                                        onChange={e => {
                                                            const newSections = [...listForm.sections]
                                                            newSections[sectionIdx].rows[rowIdx].title = e.target.value
                                                            setListForm({ ...listForm, sections: newSections })
                                                        }}
                                                    />
                                                    <Input
                                                        placeholder="Description (optional, max 72 chars)"
                                                        value={row.description}
                                                        maxLength={72}
                                                        className="text-sm"
                                                        onChange={e => {
                                                            const newSections = [...listForm.sections]
                                                            newSections[sectionIdx].rows[rowIdx].description = e.target.value
                                                            setListForm({ ...listForm, sections: newSections })
                                                        }}
                                                    />
                                                </div>
                                                {section.rows.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="flex-shrink-0"
                                                        onClick={() => {
                                                            const newSections = [...listForm.sections]
                                                            newSections[sectionIdx].rows = section.rows.filter((_, i) => i !== rowIdx)
                                                            setListForm({ ...listForm, sections: newSections })
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowListDialog(false)}>{t('cancel')}</Button>
                        <Button
                            onClick={() => {
                                onSendListMessage(listForm)
                                setShowListDialog(false)
                                // Reset form
                                setListForm({
                                    headerText: "",
                                    bodyText: "",
                                    footerText: "",
                                    buttonText: "",
                                    sections: [{
                                        title: "",
                                        rows: [{ id: "row-1", title: "", description: "" }]
                                    }]
                                })
                            }}
                            disabled={sending || !listForm.bodyText.trim() || !listForm.buttonText.trim() ||
                                listForm.sections.some(s => s.rows.some(r => !r.title.trim()))}
                        >
                            Send List Message
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
