import React, { useState } from "react";
import { Plus, X, Tag } from "lucide-react";
import { Note } from "../types";

interface AddNoteModalProps {
  onClose: () => void;
  onAdd: (newNote: Partial<Note>) => void;
}

const COLORS = [
  { name: "White", bg: "bg-white border-slate-200", text: "text-slate-800" },
  { name: "Cream", bg: "bg-amber-50/70 border-amber-100", text: "text-amber-900" },
  { name: "Emerald", bg: "bg-emerald-50/70 border-emerald-100", text: "text-emerald-900" },
  { name: "Sky", bg: "bg-sky-50/80 border-sky-100", text: "text-sky-900" },
  { name: "Indigo", bg: "bg-indigo-50/70 border-indigo-100", text: "text-indigo-950" },
  { name: "Rose", bg: "bg-rose-50/70 border-rose-100", text: "text-rose-900" },
];

export default function AddNoteModal({ onClose, onAdd }: AddNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [bgColor, setBgColor] = useState("bg-white text-slate-800");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) {
      alert("Note must have a title or some body content!");
      return;
    }

    onAdd({
      title: title.trim() || "Untitled Note",
      content,
      color: bgColor,
      tags,
    });
    onClose();
  };

  return (
    <div id="add-note-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div
        id="add-note-modal-card"
        className={`w-full max-w-lg rounded-3xl border shadow-xl p-6 transition-all scale-100 ${bgColor.split(" ")[0]}`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100/50 mb-4">
          <h2 className="font-display font-bold text-slate-900 text-lg">Create New Note</h2>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900/5 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              id="new-note-title"
              type="text"
              placeholder="E.g., Shopping List or Project Memo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-slate-800 bg-white/70 border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400 font-sans font-medium text-sm transition-all shadow-sm"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Note Content
            </label>
            <textarea
              id="new-note-content"
              placeholder="What's on your mind? Or write checklists like:&#10;- [ ] Buy groceries&#10;- [ ] Code real-time sync"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full text-slate-800 bg-white/70 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-indigo-400 font-sans text-sm leading-relaxed transition-all resize-none shadow-sm"
            />
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Highlight Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((col) => (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => setBgColor(`${col.bg} ${col.text}`)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${col.bg} ${col.text} ${
                    bgColor.startsWith(col.bg) ? "ring-2 ring-slate-800 ring-offset-2 scale-105" : ""
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tags & Labels
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="new-note-tag-field"
                  type="text"
                  placeholder="Type a word and press Add or Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="w-full text-slate-800 bg-white/70 border border-slate-200 pl-10 pr-3.5 py-2 rounded-xl outline-none focus:border-indigo-400 font-sans text-xs transition-all shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Add Tag
              </button>
            </div>

            {/* List of active tags to create */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tg) => (
                  <span
                    key={tg}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] bg-slate-900/10 border border-slate-900/5 text-slate-700 font-bold"
                  >
                    #{tg}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tg)}
                      className="hover:bg-slate-900/10 rounded-full inline-flex items-center justify-center p-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5 text-slate-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100/50">
            <button
              id="cancel-create-btn"
              type="button"
              onClick={onClose}
              className="px-4.5 py-2.5 text-xs font-semibold rounded-xl hover:bg-slate-900/5 text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-create-btn"
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all cursor-pointer active:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
