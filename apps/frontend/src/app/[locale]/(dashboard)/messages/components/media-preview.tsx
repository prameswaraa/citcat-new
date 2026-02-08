"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  AlertCircle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type MediaType = "image" | "video" | "audio" | "document"

export interface MediaPreviewProps {
  mediaUrl: string | null
  mediaType: MediaType
  caption?: string
  filename?: string
  isOutbound: boolean
}

// Helper to determine if URL is stored locally or needs proxy
function getDisplayUrl(mediaUrl: string | null, apiUrl: string): string | null {
  if (!mediaUrl) return null
  // If it's already a full URL (stored media), use it directly
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    return mediaUrl
  }
  // Otherwise, it's a media ID - use proxy endpoint
  return `${apiUrl}/api/v1/media/proxy/${mediaUrl}`
}

// Get file extension from filename or URL
function getFileExtension(filename?: string, url?: string): string {
  const source = filename || url || ""
  const match = source.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return match ? match[1].toUpperCase() : "FILE"
}

// Get appropriate icon for document type
function getDocumentIcon(extension: string) {
  const ext = extension.toLowerCase()
  if (["pdf"].includes(ext)) {
    return <FileText className="h-6 w-6 text-red-500" />
  }
  if (["doc", "docx"].includes(ext)) {
    return <FileText className="h-6 w-6 text-blue-500" />
  }
  if (["xls", "xlsx"].includes(ext)) {
    return <FileSpreadsheet className="h-6 w-6 text-green-500" />
  }
  if (["ppt", "pptx"].includes(ext)) {
    return <FileImage className="h-6 w-6 text-orange-500" />
  }
  return <File className="h-6 w-6 text-gray-500" />
}


export function MediaPreview({
  mediaUrl,
  mediaType,
  caption,
  filename,
  isOutbound,
}: MediaPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const displayUrl = getDisplayUrl(mediaUrl, apiUrl)

  const handleLoad = useCallback(() => {
    setLoading(false)
    setError(false)
    setRetrying(false)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
    setError(true)
    setRetrying(false)
  }, [])

  const handleRetry = useCallback(() => {
    setRetrying(true)
    setError(false)
    setLoading(true)
    setRetryKey((prev) => prev + 1)
  }, [])

  // No media URL provided
  if (!displayUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-black/5 dark:bg-white/10 rounded-lg">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Media not available</span>
      </div>
    )
  }

  // Loading placeholder
  const LoadingPlaceholder = ({ className }: { className?: string }) => (
    <Skeleton className={cn("rounded-lg", className)} />
  )

  // Error state with retry
  const ErrorState = () => (
    <div className="flex flex-col items-center gap-2 p-4 bg-black/5 dark:bg-white/10 rounded-lg">
      <AlertCircle className="h-6 w-6 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Failed to load media</span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={retrying}
        className="h-7 text-xs"
      >
        {retrying ? (
          <>
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </>
        )}
      </Button>
    </div>
  )

  // Render based on media type
  switch (mediaType) {
    case "image":
      return (
        <ImagePreview
          url={displayUrl}
          caption={caption}
          isOutbound={isOutbound}
          loading={loading}
          error={error}
          retryKey={retryKey}
          lightboxOpen={lightboxOpen}
          onLoad={handleLoad}
          onError={handleError}
          onRetry={handleRetry}
          onLightboxOpen={() => setLightboxOpen(true)}
          onLightboxClose={() => setLightboxOpen(false)}
          LoadingPlaceholder={LoadingPlaceholder}
          ErrorState={ErrorState}
        />
      )

    case "video":
      return (
        <VideoPreview
          url={displayUrl}
          caption={caption}
          isOutbound={isOutbound}
          loading={loading}
          error={error}
          retryKey={retryKey}
          onLoad={handleLoad}
          onError={handleError}
          LoadingPlaceholder={LoadingPlaceholder}
          ErrorState={ErrorState}
        />
      )

    case "audio":
      return (
        <AudioPreview
          url={displayUrl}
          caption={caption}
          isOutbound={isOutbound}
          loading={loading}
          error={error}
          retryKey={retryKey}
          onLoad={handleLoad}
          onError={handleError}
          LoadingPlaceholder={LoadingPlaceholder}
          ErrorState={ErrorState}
        />
      )

    case "document":
      return (
        <DocumentPreview
          url={displayUrl}
          filename={filename}
          caption={caption}
          isOutbound={isOutbound}
        />
      )

    default:
      return null
  }
}


// Image Preview with Lightbox (Requirement 2.1, 2.2, 2.3, 2.4)
interface ImagePreviewProps {
  url: string
  caption?: string
  isOutbound: boolean
  loading: boolean
  error: boolean
  retryKey: number
  lightboxOpen: boolean
  onLoad: () => void
  onError: () => void
  onRetry: () => void
  onLightboxOpen: () => void
  onLightboxClose: () => void
  LoadingPlaceholder: React.FC<{ className?: string }>
  ErrorState: React.FC
}

function ImagePreview({
  url,
  caption,
  isOutbound,
  loading,
  error,
  retryKey,
  lightboxOpen,
  onLoad,
  onError,
  onLightboxOpen,
  onLightboxClose,
  LoadingPlaceholder,
  ErrorState,
}: ImagePreviewProps) {
  if (error) {
    return <ErrorState />
  }

  return (
    <div className="space-y-2">
      {/* Thumbnail */}
      <div className="relative">
        {loading && <LoadingPlaceholder className="w-[250px] h-[150px]" />}
        <img
          key={retryKey}
          src={url}
          alt={caption || "Image attachment"}
          className={cn(
            "max-w-[250px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity",
            loading && "hidden"
          )}
          onLoad={onLoad}
          onError={onError}
          onClick={onLightboxOpen}
        />
      </div>

      {/* Caption */}
      {caption && (
        <p className="text-sm whitespace-pre-wrap">{caption}</p>
      )}

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={onLightboxClose}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>Image Preview</DialogTitle>
          </VisuallyHidden>
          <div className="relative flex items-center justify-center p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onLightboxClose}
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
            >
              <X className="h-5 w-5" />
            </Button>
            <img
              src={url}
              alt={caption || "Full size image"}
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
          </div>
          {caption && (
            <p className="text-white text-center pb-4 px-4">{caption}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


// Video Preview with Player (Requirement 3.1, 3.2, 3.3, 3.4)
interface VideoPreviewProps {
  url: string
  caption?: string
  isOutbound: boolean
  loading: boolean
  error: boolean
  retryKey: number
  onLoad: () => void
  onError: () => void
  LoadingPlaceholder: React.FC<{ className?: string }>
  ErrorState: React.FC
}

function VideoPreview({
  url,
  caption,
  isOutbound,
  loading,
  error,
  retryKey,
  onLoad,
  onError,
  LoadingPlaceholder,
  ErrorState,
}: VideoPreviewProps) {
  if (error) {
    return (
      <div className="space-y-2">
        <ErrorState />
        {/* Fallback download link */}
        <a
          href={url}
          download
          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
        >
          <Download className="h-3 w-3" />
          Download video
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {loading && <LoadingPlaceholder className="w-[250px] h-[150px]" />}
      <video
        key={retryKey}
        src={url}
        controls
        preload="metadata"
        className={cn(
          "max-w-[250px] rounded-lg",
          loading && "hidden"
        )}
        onLoadedData={onLoad}
        onError={onError}
      />
      {caption && (
        <p className="text-sm whitespace-pre-wrap">{caption}</p>
      )}
    </div>
  )
}


// Audio Preview with Player (Requirement 4.1, 4.2, 4.3, 4.4)
interface AudioPreviewProps {
  url: string
  caption?: string
  isOutbound: boolean
  loading: boolean
  error: boolean
  retryKey: number
  onLoad: () => void
  onError: () => void
  LoadingPlaceholder: React.FC<{ className?: string }>
  ErrorState: React.FC
}

function AudioPreview({
  url,
  caption,
  isOutbound,
  loading,
  error,
  retryKey,
  onLoad,
  onError,
  LoadingPlaceholder,
  ErrorState,
}: AudioPreviewProps) {
  if (error) {
    return (
      <div className="space-y-2">
        <ErrorState />
        {/* Fallback download link */}
        <a
          href={url}
          download
          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
        >
          <Download className="h-3 w-3" />
          Download audio
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {loading && <LoadingPlaceholder className="w-[200px] h-[40px]" />}
      <audio
        key={retryKey}
        src={url}
        controls
        preload="metadata"
        className={cn(
          "w-full max-w-[250px]",
          loading && "hidden"
        )}
        onLoadedData={onLoad}
        onError={onError}
      />
      {caption && (
        <p className="text-sm whitespace-pre-wrap">{caption}</p>
      )}
    </div>
  )
}


// Document Preview with Download (Requirement 5.1, 5.2, 5.3, 5.4)
interface DocumentPreviewProps {
  url: string
  filename?: string
  caption?: string
  isOutbound: boolean
}

function DocumentPreview({
  url,
  filename,
  caption,
  isOutbound,
}: DocumentPreviewProps) {
  const extension = getFileExtension(filename, url)
  const displayName = filename || `Document.${extension.toLowerCase()}`

  return (
    <div className="space-y-2">
      <a
        href={url}
        download={displayName}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg transition-colors",
          isOutbound
            ? "bg-white/10 hover:bg-white/20"
            : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
        )}
      >
        {/* File icon */}
        <div className={cn(
          "h-10 w-10 rounded flex items-center justify-center",
          isOutbound ? "bg-white/20" : "bg-background"
        )}>
          {getDocumentIcon(extension)}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isOutbound ? "text-white" : ""
          )}>
            {displayName}
          </p>
          <p className={cn(
            "text-xs",
            isOutbound ? "text-white/70" : "text-muted-foreground"
          )}>
            {extension} • Click to download
          </p>
        </div>

        {/* Download icon */}
        <Download className={cn(
          "h-4 w-4 flex-shrink-0",
          isOutbound ? "text-white/70" : "text-muted-foreground"
        )} />
      </a>

      {caption && (
        <p className="text-sm whitespace-pre-wrap">{caption}</p>
      )}
    </div>
  )
}
