import { useState, useEffect, useMemo } from "react";
import { Note } from "./types";
import SyncIndicator from "./components/SyncIndicator";
import RoomSelector from "./components/RoomSelector";
import NoteCard from "./components/NoteCard";
import AddNoteModal from "./components/AddNoteModal";
import NoteDetailModal from "./components/NoteDetailModal";
import { 
  StickyNote, 
  Plus, 
  Search, 
  Sparkles, 
  Grid, 
  AlertCircle,
  HelpCircle,
  Hash,
  XCircle
} from "lucide-react";

export default function App() {
  // Device Identity - Cached on local storage to preserve names across refreshes
  const [deviceId] = useState(() => {
    const saved = localStorage.getItem("syncnotes_device_id");
    if (saved) return saved;
    const generated = `dev_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("syncnotes_device_id", generated);
    return generated;
  });

  const [deviceName, setDeviceName] = useState(() => {
    const saved = localStorage.getItem("syncnotes_device_name");
    if (saved) return saved;
    
    // Guess human-friendly device based on screen size / platform
    const platform = navigator.userAgent.toLowerCase();
    let osLabel = "Web Client";
    if (platform.includes("mac")) osLabel = "Macbook OS";
    else if (platform.includes("windows")) osLabel = "Windows PC";
    else if (platform.includes("android")) osLabel = "Android Phone";
    else if (platform.includes("iphone") || platform.includes("ipad")) osLabel = "Apple Device";
    else if (platform.includes("linux")) osLabel = "Linux Machine";

    const label = `${osLabel} ${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem("syncnotes_device_name", label);
    return label;
  });

  // Room Identifier - Initialized from URL query (?room=XYZ) or defaulting to DEMO-ROOM
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room") || params.get("r");
    return roomParam ? roomParam.toUpperCase() : "DEMO-ROOM";
  });

  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [syncStatus, setSyncStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [activeCount, setActiveCount] = useState(1);
  const [devicesList, setDevicesList] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  
  // Detail popup state
  const [activeSelectedNote, setActiveSelectedNote] = useState<Note | null>(null);

  // Sync Device Name
  const handleDeviceNameChange = (newName: string) => {
    setDeviceName(newName);
    localStorage.setItem("syncnotes_device_name", newName);
  };

  // Sync Room Change - Syncs URL so the user can easily share a tab/link to another machine
  const handleRoomChange = (newRoom: string) => {
    const cleaned = newRoom.trim().toUpperCase();
    setRoomId(cleaned);
    
    // Update browser URL query string without reloading the page
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${cleaned}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  // Real-time synchronization engine via Server-Sent Events (SSE)
  useEffect(() => {
    setSyncStatus("connecting");
    setNotes([]); // Reset lists when moving rooms

    const sseUrl = `/api/rooms/${roomId}/sync?deviceId=${deviceId}&deviceName=${encodeURIComponent(deviceName)}`;
    const eventSource = new EventSource(sseUrl);

    // Connected successfully
    eventSource.onopen = () => {
      setSyncStatus("connected");
    };

    // Receive initial notes batch
    eventSource.addEventListener("initial", (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && Array.isArray(payload.notes)) {
          setNotes(payload.notes);
        }
      } catch (err) {
        console.error("Failed to parse initial batch", err);
      }
    });

    // Receive continuous real-time changes
    eventSource.addEventListener("note-update", (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.updatedNote) {
          const { updatedNote } = payload;
          setNotes((prevNotes) => {
            const index = prevNotes.findIndex((n) => n.id === updatedNote.id);
            if (index > -1) {
              const updated = [...prevNotes];
              updated[index] = updatedNote;
              return updated;
            } else {
              return [...prevNotes, updatedNote];
            }
          });

          // Keep currently open active modal synced in real-time
          setActiveSelectedNote((currentActive) => {
            if (currentActive && currentActive.id === updatedNote.id) {
              return updatedNote;
            }
            return currentActive;
          });
        }
      } catch (err) {
        console.error("Failed to parse note-update payload", err);
      }
    });

    // Receive note deletions
    eventSource.addEventListener("note-delete", (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.deletedNoteId) {
          setNotes((prevNotes) => prevNotes.filter((n) => n.id !== payload.deletedNoteId));

          // Auto-close open modal if note has been deleted
          setActiveSelectedNote((currentActive) => {
            if (currentActive && currentActive.id === payload.deletedNoteId) {
              return null;
            }
            return currentActive;
          });
        }
      } catch (err) {
        console.error("Failed to parse note-delete payload", err);
      }
    });

    // Receive presence updates showing active synchronized machines
    eventSource.addEventListener("presence", (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload) {
          setActiveCount(payload.activeDevicesCount || 1);
          setDevicesList(payload.devices || []);
        }
      } catch (err) {
        console.error("Failed to parse presence payload", err);
      }
    });

    // Connection errors / reconnect retries
    eventSource.onerror = (e) => {
      console.warn("Sync socket stream interrupted, auto-retrying...", e);
      setSyncStatus("error");
    };

    return () => {
      eventSource.close();
    };
  }, [roomId, deviceId, deviceName]);

  // Handle addition of a new note in database
  const handleAddNote = async (newNoteFields: Partial<Note>) => {
    const timestamp = new Date().toISOString();
    const notePayload: Note = {
      id: `note_${Math.random().toString(36).substring(2, 11)}`,
      title: newNoteFields.title || "Untitled Note",
      content: newNoteFields.content || "",
      color: newNoteFields.color || "bg-white",
      pinned: false,
      tags: newNoteFields.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastEditedBy: deviceName,
    };

    // Optimistically project on local screen
    setNotes((prev) => [...prev, notePayload]);

    try {
      const res = await fetch(`/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notePayload),
      });
      if (!res.ok) throw new Error("Server rejected note insertion");
    } catch (err) {
      console.error("Failed to persist new note", err);
      // Revert optimism if insert crashed
      setNotes((prev) => prev.filter((n) => n.id !== notePayload.id));
    }
  };

  // Handle edits/updates to single note properties (autosame color, toggle check, edit text)
  const handleUpdateNote = async (updated: Note) => {
    // Dynamic updates locally
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    try {
      const res = await fetch(`/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Server rejected note updates");
    } catch (err) {
      console.error("Failed to synchronize note updates", err);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    const backup = notes.find((n) => n.id === noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      const res = await fetch(`/api/rooms/${roomId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Server rejected deletion request");
    } catch (err) {
      console.error("Failed to synchronize note delete", err);
      // Revert if request failed
      if (backup) setNotes((prev) => [...prev, backup]);
    }
  };

  // Filter notes based on Search Query and Activated click-filters tags
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = selectedTagFilter 
        ? note.tags && note.tags.some((t) => t.toLowerCase() === selectedTagFilter.toLowerCase())
        : true;

      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTagFilter]);

  // Extract all existing unique tags across all notes to populate the side exploration categories
  const allUniqueTags = useMemo(() => {
    const list = new Set<string>();
    notes.forEach((note) => {
      if (note.tags) {
        note.tags.forEach((t) => list.add(t.toLowerCase()));
      }
    });
    return Array.from(list);
  }, [notes]);

  // Group notes into pinned and non-pinned
  const { pinnedNotes, regularNotes } = useMemo(() => {
    const pinned = filteredNotes.filter((n) => n.pinned);
    const regular = filteredNotes.filter((n) => !n.pinned);
    return { pinnedNotes: pinned, regularNotes: regular };
  }, [filteredNotes]);

  // Create mock default content if room is newly initiated to demonstrate features out-of-the-box
  const handlePopulateSample = () => {
    const sampleNotes = [
      {
        title: "Welcome to SyncNotes! 🚀",
        content: "This application features standard real-time multi-device cloud synchronization over lightweight HTTP server events stream!\n\nOpen this page in a second browser window, or click the 'Sync Phone/Device' button in the status panel to copy and load the URL on your mobile phone or tablet. Watch typing, ticking checklist edits, and color adjustments mirror across all screens instantly!",
        color: "bg-indigo-50 border-indigo-100 text-indigo-950",
        tags: ["sync-demo", "welcome"],
      },
      {
        title: "Weekly Checklist 📝",
        content: "Interactive checklists updates synchronize across devices as soon as you toggle the checkboxes!\n\n- [x] Create shared cloud notes room\n- [ ] Open synchronization link on phone\n- [ ] Double-click card to edit inline\n- [ ] Try switching backgrounds\n- [ ] Add team tags",
        color: "bg-amber-50/70 border-amber-100 text-amber-900",
        tags: ["tasks", "checklist"],
      },
    ];

    sampleNotes.forEach(note => handleAddNote(note));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Upper Brand Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-100">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-slate-900 text-lg tracking-tight leading-none">
                SyncNotes
              </h1>
              <span className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase">
                Real-time Multi-Device Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Realtime Search Bar input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="main-search-input"
                type="text"
                placeholder="Search notes content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/100 border border-slate-200 pl-9 pr-8 py-2 text-xs font-semibold rounded-xl outline-none focus:bg-white focus:border-indigo-400 transition-all text-slate-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 font-semibold text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Action FAB Trigger */}
            <button
              id="fab-header-add"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>

        </div>
      </header>

      {/* Primary Panels Dashboard */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebars for Workspace sync & presence controls */}
        <div className="lg:col-span-1 space-y-6">
          <SyncIndicator
            status={syncStatus}
            activeDevicesCount={activeCount}
            devicesList={devicesList}
            roomId={roomId}
            deviceName={deviceName}
            onDeviceNameChange={handleDeviceNameChange}
          />

          <RoomSelector
            currentRoomId={roomId}
            onRoomChange={handleRoomChange}
          />

          {/* Tag Exploration Card */}
          <div id="tag-index-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4.5 h-4.5 text-slate-400" />
              <h3 className="font-display font-black text-slate-800 text-xs uppercase tracking-wider">
                Filter by Tag
              </h3>
            </div>
            
            {allUniqueTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  id="tag-filter-reset"
                  onClick={() => setSelectedTagFilter(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    selectedTagFilter === null
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                  } transition-colors cursor-pointer`}
                >
                  All Tags
                </button>
                {allUniqueTags.map((tag) => (
                  <button
                    key={tag}
                    id={`tag-filter-${tag}`}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      selectedTagFilter === tag
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                    } transition-colors cursor-pointer`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No tags loaded yet in this database.</p>
            )}
          </div>
        </div>

        {/* Notes Listings Column with Premium Box styling */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Active Filtering Warning indicators */}
          {(searchQuery || selectedTagFilter) && (
            <div className="flex items-center justify-between bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-slate-600">
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4.5 h-4.5 text-slate-400" />
                <span>
                  Showing results matching{" "}
                  {searchQuery && (
                    <span className="font-semibold text-slate-800">
                      &quot;{searchQuery}&quot;
                    </span>
                  )}
                  {searchQuery && selectedTagFilter && " and "}
                  {selectedTagFilter && (
                    <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-700 font-bold ml-1">
                      #{selectedTagFilter}
                    </span>
                  )}
                </span>
              </span>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTagFilter(null);
                }}
                className="text-indigo-600 hover:underline font-bold"
              >
                Reset Filter
              </button>
            </div>
          )}

          {notes.length === 0 ? (
            /* Empty notes welcome prompt (matching screenshot style) */
            <div id="notes-empty-state" className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-200 rounded-3xl bg-white shadow-sm min-h-[400px]">
              <div className="bg-indigo-50 rounded-full p-4 mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg mb-2">
                Room {roomId} is currently empty
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                Connect multiple devices, share this room with friends, or hit the buttons below to begin real-time collaborative writing!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="btn-populate-mock"
                  onClick={handlePopulateSample}
                  className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 font-black text-xs py-3 px-5 rounded-xl transition-all cursor-pointer"
                >
                  Load Interactive Samples
                </button>
                <button
                  id="btn-add-primary-note"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 px-5 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
                >
                  Create Fresh Note
                </button>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            /* Search yielded no matches */
            <div className="text-center py-16 border border-slate-150 rounded-3xl bg-white shadow-sm">
              <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-700">No notes matched your query</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No items containing &quot;{searchQuery}&quot; or tagged with &quot;#{selectedTagFilter}&quot; were found.
              </p>
            </div>
          ) : (
            /* Workspace Notes Box matching styling parameters of indicators */
            <div id="workspace-notes-box" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6 min-h-[480px]">
              
              {/* Dynamic Header row of Workspace Box */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
                <div>
                  <h3 className="font-display font-black text-slate-900 text-sm tracking-tight uppercase leading-none mb-1">
                    Synchronized Workspace
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    All notes inside room: <strong className="text-indigo-600">{roomId}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/60 rounded-xl px-2.5 py-1 text-[10px] text-indigo-700 font-extrabold shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{filteredNotes.length} Note{filteredNotes.length !== 1 ? "s" : ""} Online</span>
                </div>
              </div>

              {/* Pinned notes grid view block */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1 border border-amber-100/30">
                      📌 Pinned Workspace
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                        deviceName={deviceName}
                        onClick={() => setActiveSelectedNote(note)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Standard notes grid view block */}
              {regularNotes.length > 0 && (
                <div className="space-y-3">
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Other Workspace Notes ({regularNotes.length})
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regularNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                        deviceName={deviceName}
                        onClick={() => setActiveSelectedNote(note)}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* Sticky Bottom Help bar */}
      <footer className="bg-slate-100 border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="flex items-center gap-1.5 justify-center">
            <HelpCircle className="w-4 h-4 opacity-75" />
            <span>How to sync? Open QR link on a phone or type the exact Room code on any browser.</span>
          </span>
          <span className="text-[10px]">
            © {new Date().getFullYear()} SyncNotes Server. Lightweight & Instant.
          </span>
        </div>
      </footer>

      {/* Floating Action Button (FAB) in the corner */}
      <button
        id="fab-button-trigger"
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer flex items-center justify-center"
        title="Add new sync note"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Overlay Creator Form Modal */}
      {isAddOpen && (
        <AddNoteModal
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAddNote}
        />
      )}

      {/* Full-Screen Zoomed Interactive Note Detail Popup View */}
      {activeSelectedNote && (
        <NoteDetailModal
          note={activeSelectedNote}
          onClose={() => setActiveSelectedNote(null)}
          onUpdate={(updatedNote) => {
            handleUpdateNote(updatedNote);
            setActiveSelectedNote(updatedNote);
          }}
          onDelete={handleDeleteNote}
          deviceName={deviceName}
        />
      )}

    </div>
  );
}
