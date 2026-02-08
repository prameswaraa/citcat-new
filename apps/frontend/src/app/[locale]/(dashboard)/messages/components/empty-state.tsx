import { MessageSquare } from "lucide-react"

export function EmptyState() {
    return (
        <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-background/50">
            <div className="text-center max-w-md p-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                    <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">WhatsApp Messages</h2>
                <p className="text-muted-foreground mb-6">
                    Select a conversation from the sidebar to start chatting or send a new message.
                </p>
            </div>
        </div>
    )
}
