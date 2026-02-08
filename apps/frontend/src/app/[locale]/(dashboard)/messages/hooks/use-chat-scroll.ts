import { useState, useEffect, useRef } from "react"

export function useChatScroll(messages: any[], selectedCustomer: any) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messageContainerRef = useRef<HTMLDivElement>(null)
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // Detect user scroll position
    const handleScroll = () => {
        if (!messageContainerRef.current) return

        const container = messageContainerRef.current
        const { scrollTop, scrollHeight, clientHeight } = container

        // Check if user is at bottom (with 100px threshold like Discord/Slack)
        const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100

        // Update shouldAutoScroll state based on position
        setShouldAutoScroll(isAtBottom)
    }

    // Auto-scroll when messages change (ONLY if shouldAutoScroll = true)
    useEffect(() => {
        if (shouldAutoScroll && messages.length > 0) {
            // Small delay to ensure DOM is updated
            setTimeout(() => scrollToBottom(), 100)
        }
    }, [messages, shouldAutoScroll])

    // Enable auto-scroll when switching customer
    useEffect(() => {
        if (selectedCustomer) {
            setShouldAutoScroll(true)
        }
    }, [selectedCustomer])

    return {
        messagesEndRef,
        messageContainerRef,
        handleScroll,
        scrollToBottom,
        setShouldAutoScroll
    }
}
