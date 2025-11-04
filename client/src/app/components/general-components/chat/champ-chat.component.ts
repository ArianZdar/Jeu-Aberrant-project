import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WORD_MAX_LENGTH } from '@app/constants/client-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { ChatMessage, JournalMessage } from '@common/game/message';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-champ-chat',
    imports: [FormsModule],
    templateUrl: './champ-chat.component.html',
    styleUrl: './champ-chat.component.scss',
})
export class ChampChatComponent implements OnInit, OnDestroy {
    messages: ChatMessage[] = [];
    newMessage: string = '';
    currentPlayerName: string = '';
    isJournalMode = false;
    journalEntries: JournalMessage[] = [];
    filteredJournalEntries: JournalMessage[] = [];
    isFiltering = false;
    currentPlayerId: string = '';
    private chatSubscription: Subscription;
    private nameSubscription: Subscription;
    private journalSubscription: Subscription;

    constructor(private chatService: ChatService) {}

    ngOnInit(): void {
        this.nameSubscription = this.chatService.currentPlayerName$.subscribe((name) => {
            this.currentPlayerName = name;
        });

        this.chatSubscription = this.chatService.messages$.subscribe((message) => {
            this.messages.unshift(message);
        });

        this.journalSubscription = this.chatService.journalMessages$.subscribe((entry) => {
            this.journalEntries.unshift(entry);
        });
        this.chatService.requestLobbyChatHistory();

        this.currentPlayerId = this.chatService.getCurrentPlayerId();
    }

    ngOnDestroy(): void {
        if (this.chatSubscription) {
            this.chatSubscription.unsubscribe();
        }
        if (this.nameSubscription) {
            this.nameSubscription.unsubscribe();
        }
        if (this.journalSubscription) {
            this.journalSubscription.unsubscribe();
        }

        this.chatService.resetToLobbyMode();
    }

    filterByPlayerId(): void {
        this.filteredJournalEntries = this.journalEntries.filter((entry) => {
            return entry.involvedPlayers?.includes(this.currentPlayerId);
        });
    }

    sendMessage() {
        if (this.newMessage.trim() && this.newMessage.length <= WORD_MAX_LENGTH) {
            this.chatService.sendChatMessage(this.newMessage.trim());
            this.newMessage = '';
        }
    }

    toggleJournal() {
        this.isJournalMode = true;
    }

    toggleChat() {
        this.isJournalMode = false;
    }

    toggleFiltering(): void {
        this.isFiltering = !this.isFiltering;
        if (this.isFiltering) {
            this.filterByPlayerId();
        }
    }
}
