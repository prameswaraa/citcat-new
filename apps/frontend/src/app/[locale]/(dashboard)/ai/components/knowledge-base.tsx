import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { KnowledgeDocument } from "@/lib/api/ai-api"

interface KnowledgeBaseProps {
  documents: KnowledgeDocument[]
  uploading: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (id: string) => void
}

export function KnowledgeBase({ documents, uploading, onUpload, onDelete }: KnowledgeBaseProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Knowledge Base Documents</CardTitle>
            <CardDescription>
              Upload PDF documents to train your AI.
            </CardDescription>
          </div>
          <div>
            <Input
              type="file"
              accept=".pdf"
              className="hidden"
              id="file-upload"
              onChange={onUpload}
              disabled={uploading}
            />
            <Button asChild disabled={uploading}>
              <Label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload PDF
              </Label>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded yet.</p>
            <p className="text-sm">Upload a PDF to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      {doc.filename}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        doc.status === "COMPLETED"
                          ? "default"
                          : doc.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                      className={
                        doc.status === "COMPLETED"
                          ? "bg-green-500 hover:bg-green-600"
                          : doc.status === "PENDING" || doc.status === "PROCESSING"
                          ? "animate-pulse"
                          : ""
                      }
                    >
                      {doc.status === "PENDING" && "Uploading..."}
                      {doc.status === "PROCESSING" && "Processing..."}
                      {doc.status === "COMPLETED" && "Completed"}
                      {doc.status === "FAILED" && "Failed"}
                    </Badge>
                    {doc.status === "FAILED" && doc.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{doc.errorMessage}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {doc.createdAt
                      ? new Date(doc.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(doc.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}