import React, { useState, useEffect } from "react";
import { Note } from "../types";
import { Pin, Trash2, Calendar, User, ChevronRight, CheckSquare, Square } from "lucide-react";

interface NoteCardProps {
  key?: string;
  note: Note;
  onUpdate: (updatedNote: Note) => void;
  onDelete: (id: string) => void;
  deviceName: string;
  onClick: () => void;
}

const COLORS = [
  { name: "White", bg: "bg-white border-slate-200 hover:border-slate-300", text: "text-slate-800" },
  { name: "Cream", bg: "bg-amber-50/70 border-amber-100 hover:border-amber-250", text: "text-amber-900" },
  { name: "Emerald", bg: "bg-emerald-50/70 border-emerald-100 hover:border-emerald-250", text: "text-emerald-900" },
  { name: "Sky", bg: "bg-sky-50/80 border-sky-100 hover:border-sky-250", text: "text-sky-900" },
  { name: "Indigo", bg: "bg-indigo-50/70 border-indigo-100 hover:border-indigo-250", text: "text-indigo-950" },
  { name: "Rose", bg: "bg-rose-50/70 border-rose-100 hover:border-rose-250", text: "text-rose-900" },
];

export default function NoteCard({ note, onUpdate, onDelete, deviceName, onClick }: NoteCardProps) {
  const [currentColor, setCurrentColor] = useState(note.color || "bg-white");

  useEffect(() => {
    setCurrentColor(note.color || "bg-white");
  }, [note.color]);

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      ...note,
      pinned: !note.pinned,
      lastEditedBy: deviceName,
    });
  };

  const handleColorChange = (e: React.MouseEvent, colorBg: string) => {
    e.stopPropagation();
    setCurrentColor(colorBg);
    onUpdate({
      ...note,
      color: colorBg,
      lastEditedBy: deviceName,
    });
  };

  const handleToggleCheckbox = (e: React.MouseEvent, itemIndex: number, currentChecked: boolean) => {
    e.stopPropagation();
    let currentLineIndex = 0;
    const lines = note.content.split("\n");
    const updatedLines = lines.map((line) => {
      if (line.match(/^[-*]\s+\[[ xX]\]/)) {
        if (currentLineIndex === itemIndex) {
          const replacement = currentChecked ? "- [ ]" : "- [x]";
          currentLineIndex++;
          return line.replace(/^[-*]\s+\[[ xX]\]/, replacement);
        }
        currentLineIndex++;
      }
      return line;
    });

    onUpdate({
      ...note,
      content: updatedLines.join("\n"),
      lastEditedBy: deviceName,
    });
  };

  const handleQuickDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this note?")) {
      onDelete(note.id);
    }
  };

  // Render a compact, clean preview (max 3 checklist items or standard text lines)
  const renderContentPreview = () => {
    if (!note.content || !note.content.trim()) {
      return <p className="text-slate-400 italic text-xs">Empty note</p>;
    }

    const lines = note.content.split("\n").filter(Boolean);
    const visibleLines = lines.slice(0, 4);
    let checkboxIndex = 0;

    return (
      <div className="space-y-1 text-xs text-slate-600 font-sans leading-relaxed">
        {visibleLines.map((line, idx) => {
          // Todo list matching
          const todoMatch = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)/);
          if (todoMatch) {
            const isChecked = todoMatch[1].toLowerCase() === "x";
            const text = todoMatch[2];
            const currentIndex = checkboxIndex;
            checkboxIndex++;

            return (
              <div 
                key={idx} 
                className="flex items-center gap-1.5 py-0.5"
                onClick={(e) => handleToggleCheckbox(e, currentIndex, isChecked)}
              >
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={`truncate flex-1 ${isChecked ? "line-through text-slate-400" : "text-slate-600"}`}>
                  {text || <span className="italic opacity-60">Item</span>}
                </span>
              </div>
            );
          }

          // Bullet match
          if (line.match(/^[-*]\s+(.*)/)) {
            const bulletText = line.replace(/^[-*]\s+/, "");
            return (
              <div key={idx} className="flex items-center gap-1 text-slate-500 pl-1">
                <span className="w-1 h-1 bg-slate-400 rounded-full shrink-0" />
                <span className="truncate">{bulletText}</span>
              </div>
            );
          }

          // Standard line
          return (
            <p key={idx} className="truncate text-slate-600">
              {line}
            </p>
          );
        })}

        {lines.length > 4 && (
          <p className="text-[10px] text-indigo-500 font-bold flex items-center gap-0.5 mt-1">
            <span>Read remaining {lines.length - 4} lines</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        )}
      </div>
    );
  };

  const matchedColorVal = COLORS.find((c) => currentColor.startsWith(c.bg.split(" ")[0])) || COLORS[0];
  const colorBgClass = matchedColorVal.bg.split(" ")[0] || "bg-white";

  return (
    <div
      id={`note-card-${note.id}`}
      onClick={onClick}
      className={`group relative rounded-2xl border p-4.5 transition-all duration-300 hover:shadow-md active:scale-[0.985] cursor-pointer flex flex-col justify-between min-h-[160px] ${matchedColorVal.bg}`}
    >
      <div>
        {/* Header containing title and pin toggle */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <h4 className={`font-display font-bold text-slate-900 text-sm leading-snug tracking-tight truncate flex-1 pr-4 ${matchedColorVal.text}`}>
            {note.title || "Untitled Note"}
          </h4>

          <button
            id={`pin-btn-${note.id}`}
            onClick={handleTogglePin}
            className={`p-1 rounded-lg hover:bg-slate-900/5 transition-all cursor-pointer ${
              note.pinned ? "text-amber-500 opacity-100" : "text-slate-300 opacity-20 hover:opacity-100"
            }`}
            title={note.pinned ? "Unpin Note" : "Pin Note"}
          >
            <Pin className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Truncated scroll-locked note content */}
        <div className="mb-3">
          {renderContentPreview()}
        </div>

        {/* Tags badges */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/5 text-slate-600 border border-slate-900/5"
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[9px] text-slate-400 font-bold">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="border-t border-slate-100/40 pt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1.5 truncate max-w-[140px]">
          <Calendar className="w-3 h-3 opacity-60" />
          <span>{new Date(note.updatedAt || note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {note.lastEditedBy && (
            <span className="flex items-center gap-0.5 max-w-[65px] truncate text-[9px]" title={`Saved by ${note.lastEditedBy}`}>
              • {note.lastEditedBy}
            </span>
          )}
        </span>

        <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Quick Color Picker swatches */}
          <div className="flex items-center gap-0.5 mr-0.5 bg-slate-900/5 p-0.5 rounded-md">
            {COLORS.map((col) => (
              <button
                key={col.name}
                onClick={(e) => handleColorChange(e, col.bg)}
                className={`w-2.5 h-2.5 rounded-full cursor-pointer border ${
                  currentColor.startsWith(col.bg.split(" ")[0]) ? "border-slate-800 scale-110" : "border-transparent"
                } ${col.bg.split(" ")[0]}`}
                title={col.name}
              />
            ))}
          </div>

          <button
            id={`delete-btn-${note.id}`}
            onClick={handleQuickDelete}
            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
