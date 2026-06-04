export interface Note {
  id: string;
  title: string;
  content: string;
  color: string; // Tailind class for background base (e.g. bg-white, bg-amber-50, etc.)
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string; // Human name or device model indicating who saved it
}

export interface SyncMessage {
  type: 'initial' | 'update' | 'presence';
  notes?: Note[];
  noteId?: string;
  updatedNote?: Note;
  deletedNoteId?: string;
  activeDevicesCount?: number;
  devices?: string[];
}

export interface RoomInfo {
  roomId: string;
  notesCount: number;
  activeDevicesCount: number;
}
