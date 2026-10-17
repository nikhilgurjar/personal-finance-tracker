"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useFinanceData, type PlanNote } from "@/hooks/use-finance-data"
import { RichTextEditor } from "@/components/plan-notes/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Calendar,
  Clock,
  MoreVertical,
  Pencil
} from "lucide-react"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { ChevronLeft } from "lucide-react"

export default function PlanNotesPage() {
  const { planNotes, addPlanNote, updatePlanNote, deletePlanNote, user, isDemo } = useFinanceData()
  const isMobile = useIsMobile()

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState("")

  // Sort notes by updated date (newest first)
  const sortedNotes = useMemo(() => {
    return [...planNotes]
      .filter((note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [planNotes, searchQuery])

  // Select first note automatically if none selected and notes exist, except on mobile
  useEffect(() => {
    if (!activeNoteId && sortedNotes.length > 0 && !isMobile) {
      setActiveNoteId(sortedNotes[0].id)
    }
  }, [activeNoteId, sortedNotes, isMobile])

  const activeNote = useMemo(() => {
    return planNotes.find(n => n.id === activeNoteId) || null
  }, [planNotes, activeNoteId])

  const handleCreateNote = async () => {
    const newNoteId = await addPlanNote({
      title: "New Note",
      content: "",
    })
    setActiveNoteId(newNoteId)
    setSearchQuery("")
    setIsEditingTitle(true)
    setTitleInput("New Note")
  }

  const handleDeleteNote = async (id: string) => {
    await deletePlanNote(id)
    if (activeNoteId === id) {
      setActiveNoteId(null)
    }
  }

  const handleContentChange = useCallback((content: string) => {
    if (activeNoteId) {
      updatePlanNote(activeNoteId, { content })
    }
  }, [activeNoteId, updatePlanNote])

  const handleTitleSubmit = () => {
    if (activeNoteId && titleInput.trim()) {
      updatePlanNote(activeNoteId, { title: titleInput.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setTitleInput(activeNote?.title || "")
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[500px] border rounded-xl overflow-hidden bg-background w-full shadow-sm">

      {/* ── Sidebar (List of Notes) ── */}
      {(!isMobile || !activeNoteId) && (
      <div className="w-full md:w-1/3 md:min-w-[280px] md:max-w-[350px] md:border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Plan Notes
            </h2>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={handleCreateNote}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-9 h-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sortedNotes.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground text-sm">
                {searchQuery ? "No notes found" : "No notes yet"}
              </div>
            ) : (
              sortedNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setActiveNoteId(note.id)
                    setIsEditingTitle(false)
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1.5 focus:outline-none",
                    activeNoteId === note.id
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm truncate flex-1">{note.title}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-6 w-6 p-0 shrink-0 rounded-md hover:bg-background/50">
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNote(note.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete note
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(note.updatedAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      )}

      {/* ── Editor Area ── */}
      {(!isMobile || activeNoteId) && (
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {activeNote ? (
          <>
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 md:mb-0">
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setActiveNoteId(null)} className="mr-1 h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                {isEditingTitle ? (
                  <Input
                    autoFocus
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={handleTitleKeyDown}
                    className="text-lg font-bold h-10 px-2 max-w-md"
                  />
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-xl font-bold truncate">{activeNote.title}</h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setTitleInput(activeNote.title)
                        setIsEditingTitle(true)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4 md:ml-0 ml-10">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Created {format(new Date(activeNote.createdAt), "MMM d, yyyy")}
                  </span>
                  {!user && isDemo && (
                    <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      Local mode
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0 bg-background">
              {/* Force re-mount of editor if note ID changes so content syncs properly */}
              <RichTextEditor
                key={activeNote.id}
                content={activeNote.content}
                onChange={handleContentChange}
                placeholder="Start writing your plan notes..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">No note selected</p>
            <p className="text-sm mb-4">Select a note from the sidebar or create a new one.</p>
            <Button onClick={handleCreateNote} className="gap-2">
              <Plus className="h-4 w-4" /> Create New Note
            </Button>
          </div>
        )}
      </div>
      )}

    </div>
  )
}
