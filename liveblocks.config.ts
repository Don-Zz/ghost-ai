declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };

    Storage: {};

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    RoomEvent:
      | { type: "AI_STATUS"; message: string; status: "start" | "processing" | "complete" | "error" }
      | { type: "CHAT_MESSAGE"; sender: string; role: "user" | "assistant"; content: string; timestamp: number };

    ThreadMetadata: {};

    RoomInfo: {};
  }
}

export {};
