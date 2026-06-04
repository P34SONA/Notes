import React, { useState } from "react";
import { FolderSymlink, LogIn, PlusCircle } from "lucide-react";

interface RoomSelectorProps {
  currentRoomId: string;
  onRoomChange: (newRoomId: string) => void;
}

export default function RoomSelector({ currentRoomId, onRoomChange }: RoomSelectorProps) {
  const [userInput, setUserInput] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      onRoomChange(userInput.trim().toUpperCase());
      setUserInput("");
    }
  };

  const handleCreateNew = () => {
    // Generate a beautiful, easily typeable human room ID (e.g., SYNC-XXXX)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing 0/O or 1/I
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newRoomId = `SYNC-${suffix}`;
    onRoomChange(newRoomId);
  };

  return (
    <div id="room-selection-widget" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FolderSymlink className="w-5 h-5 text-indigo-600" />
          <h2 className="font-display font-black text-slate-800 text-sm uppercase tracking-wider">
            Workspace Namespace
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed font-medium">
          Enter a unique room code to synchronize notes across devices. Anyone with the matching namespace reads/writes the same list instantly.
        </p>

        {/* Current Active Channel */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-3 text-center mb-4">
          <span className="block text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
            Active Real-time Room
          </span>
          <span className="font-mono text-xl font-bold text-indigo-800 tracking-wider">
            {currentRoomId}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            id="room-input-field"
            type="text"
            placeholder="E.g., SYNC-ABCD"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold border border-slate-200 outline-none focus:border-indigo-400"
          />
          <button
            id="btn-join-room"
            type="submit"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Join</span>
          </button>
        </form>

        <button
          id="btn-create-room"
          onClick={handleCreateNew}
          type="button"
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border border-dashed border-indigo-300 bg-indigo-50/20 hover:bg-indigo-50 text-indigo-600 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Collaborative Room</span>
        </button>
      </div>
    </div>
  );
}
