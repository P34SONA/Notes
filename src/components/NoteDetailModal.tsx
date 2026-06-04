import React, { useState, useEffect } from "react";
import { Note } from "../types";
import { Pin, Trash2, Check, Calendar, Plus, X, User, Tag } from "lucide-react";

interface NoteDetailModalProps {
  note: Note;
  onClose: () => void;
  onUpdate: (updatedNote: Note) => void;
  onDelete: (id: string) => void;
  deviceName: string;
}

const COLORS = [
  { name: "White", bg: "bg-white border-slate-200", text: "text-slate-800" },
  { name: "Cream", bg: "bg-amber-50/70 border-amber-100", text: "text-amber-900" },
  { name: "Emerald", bg: "bg-emerald-50/70 border-emerald-100", text: "text-emerald-900" },
  { name: "Sky", bg: "bg-sky-50/80 border-sky-100", text: "text-sky-900" },
  { name: "Indigo", bg: "bg-indigo-50/70 border-indigo-100", text: "text-indigo-950" },
  { name: "Rose", bg: "bg-rose-50/70 border-rose-100", text: "text-rose-900" },
];

export default function NoteDetailModal({
  note,
  onClose,
  onUpdate,
  onDelete,
  deviceName,
}: NoteDetailModalProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [currentColor, setCurrentColor] = useState(note.color || "bg-white");
  const [newTag, setNewTag] = useState("");
  const [isEditingText, setIsEditingText] = useState(false);

  // Synchronize from server values in real-time
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setCurrentColor(note.color || "bg-white");
  }, [note]);

  const handleTogglePin = () => {
    const updated = {
      ...note,
      pinned: !note.pinned,
      lastEditedBy: deviceName,
    };
    onUpdate(updated);
  };

  const handleColorChange = (colorBg: string) => {
    setCurrentColor(colorBg);
    const updated = {
      ...note,
      color: colorBg,
      lastEditedBy: deviceName,
    };
    onUpdate(updated);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag("");
      onUpdate({
        ...note,
        tags: updatedTags,
        lastEditedBy: deviceName,
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    onUpdate({
      ...note,
      tags: updatedTags,
      lastEditedBy: deviceName,
    });
  };

  const handleToggleCheckboxInModal = (itemIndex: number, currentChecked: boolean) => {
    let currentLineIndex = 0;
    const lines = content.split("\n");
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

    const updatedContent = updatedLines.join("\n");
    setContent(updatedContent);
    onUpdate({
      ...note,
      content: updatedContent,
      lastEditedBy: deviceName,
    });
  };

  const triggerSaveTextChanges = () => {
    onUpdate({
      ...note,
      title: title.trim() || "Untitled Note",
      content: content,
      lastEditedBy: deviceName,
    });
    setIsEditingText(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this note?")) {
      onDelete(note.id);
      onClose();
    }
  };

  // Content rendering parsing bullet points & checklists
  const renderInteractiveContent = () => {
    if (!content.trim()) {
      return (
        <div 
          onClick={() => setIsEditingText(true)}
          className="text-slate-400 italic text-sm cursor-pointer py-4 hover:bg-slate-900/5 px-3 rounded-xl transition-all"
        >
          No text content. Click to begin writing details or checklists...
        </div>
      );
    }

    const lines = content.split("\n");
    let checkboxIndex = 0;

    return (
      <div className="space-y-2 text-base text-slate-700 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          // Checkboxes: - [ ] or - [x]
          const todoMatch = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)/);
          if (todoMatch) {
            const isChecked = todoMatch[1].toLowerCase() === "x";
            const text = todoMatch[2];
            const currentIndex = checkboxIndex;
            checkboxIndex++;

            return (
              <div key={idx} className="flex items-start gap-3 my-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleCheckboxInModal(currentIndex, isChecked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                />
                <span className={`text-base transition-all ${isChecked ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {text || <span className="text-slate-300 italic">Empty checkbox item</span>}
                </span>
              </div>
            );
          }

          // Bullet points
          if (line.match(/^[-*]\s+(.*)/)) {
            const bulletText = line.replace(/^[-*]\s+/, "");
            return (
              <li key={idx} className="list-disc list-inside ml-2 text-slate-600 font-medium">
                {bulletText}
              </li>
            );
          }

          // Plain text line
          return (
            <p key={idx} className={line.trim() === "" ? "h-3" : "min-h-[1.5rem]"}>
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  const matchedColors = COLORS.find((c) => currentColor.startsWith(c.bg)) || COLORS[0];
  const dynamicClasses = matchedColors.bg.split(" ")[0] || "bg-white";

  return (
    <div id="note-detail-popup-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div
        id="note-detail-modal-card"
        className={`w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[85vh] ${dynamicClasses}`}
      >
        {/* Upper bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/40">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                note.pinned ? "bg-amber-500/10 text-amber-500" : "text-slate-400 hover:text-slate-600 hover:bg-slate-900/5"
              }`}
              title={note.pinned ? "Unpin Note" : "Pin Note"}
            >
              <Pin className="w-4.5 h-4.5 fill-current" />
            </button>
            <span className="text-xs text-slate-400 font-bold bg-slate-900/5 px-2.5 py-1 rounded-lg">
              SYNCED AT: {new Date(note.updatedAt || note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900/5 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Center Portion */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Header Title Editor */}
          <div className="space-y-1">
            <input
              id="detail-title-field"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onUpdate({ ...note, title: e.target.value, lastEditedBy: deviceName });
              }}
              placeholder="Give this note a title"
              className="w-full font-display font-extrabold text-2xl text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-400/50 outline-none pb-1 transition-all leading-tight pr-6"
            />
          </div>

          {/* Body Content Editor Toggle */}
          <div className="bg-white/40 backdrop-blur-xs rounded-2xl border border-slate-100/30 p-5 min-h-[160px] relative">
            {isEditingText ? (
              <div className="space-y-3">
                <textarea
                  id="detail-textarea-field"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    onUpdate({ ...note, content: e.target.value, lastEditedBy: deviceName });
                  }}
                  rows={8}
                  placeholder="Type anything. Prefix items with '- [ ] ' for beautiful checkboxes, or '- ' for standard lists."
                  className="w-full text-sm text-slate-800 bg-transparent outline-none resize-none font-sans leading-relaxed"
                />
                
                <div className="flex justify-between items-center pt-2 border-t border-slate-100/30">
                  <span className="text-[10px] text-slate-400 italic">
                    Press &quot;Save Text&quot; to exit draft editing mode
                  </span>
                  <button
                    onClick={triggerSaveTextChanges}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Save Text View
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="group/details cursor-pointer relative"
                onClick={() => setIsEditingText(true)}
                title="Click any text block to edit body content"
              >
                {renderInteractiveContent()}
                <span className="absolute top-0 right-0 opacity-0 group-hover/details:opacity-100 transition-opacity text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                  Click text box to edit
                </span>
              </div>
            )}
          </div>

          {/* Color Switchers */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              Aura Highlight Background
            </span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((col) => (
                <button
                  key={col.name}
                  onClick={() => handleColorChange(col.bg)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${col.bg} ${
                    currentColor.startsWith(col.bg) ? "ring-2 ring-slate-800 ring-offset-2 scale-105 font-black" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border border-slate-200/50 ${col.bg.split(" ")[0]}`} />
                  <span>{col.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags Label Editor */}
          <div className="space-y-2 border-t border-slate-100/40 pt-5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Labels & Metadata Tags
            </label>
            
            <div className="flex flex-wrap gap-1.5 items-center">
              {tags.map((tg) => (
                <span
                  key={tg}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-900/5 text-slate-700 border border-slate-900/5"
                >
                  #{tg}
                  <button
                    onClick={() => handleRemoveTag(tg)}
                    className="w-4 h-4 hover:bg-slate-900/10 rounded-full inline-flex items-center justify-center cursor-pointer p-0"
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                  </button>
                </span>
              ))}

              <div className="inline-flex items-center gap-1.5 relative">
                <input
                  id="detail-tag-input-field"
                  type="text"
                  placeholder="New tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  className="w-20 text-xs bg-white/60 border border-slate-200 py-1 px-2.5 focus:border-indigo-400 outline-none rounded-xl"
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar control row */}
        <div className="px-6 py-4 border-t border-slate-100/40 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {note.lastEditedBy && (
              <span className="flex items-center gap-1 bg-white/80 border border-slate-100 rounded-lg px-2.5 py-1">
                <User className="w-3.5 h-3.5 opacity-60 text-indigo-500" />
                <span>Last updated by: <strong>{note.lastEditedBy}</strong></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Discard Note</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Minimize Note</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
