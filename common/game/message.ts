export interface ChatMessage {
    timeStamp: string;
    senderName: string;
    senderId: string;
    content: string;
}

export interface RoomMessages {
    messages: ChatMessage[];
}

export interface JournalMessage {
    timeStamp: string;
    content: string;
    involvedPlayers: string[];
}

export interface RoomJournal {
    journals: JournalMessage[];
}