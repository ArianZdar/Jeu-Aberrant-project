import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChampChatComponent } from './champ-chat.component';
import { ChatService } from '@app/services/chat/chat.service';
import { JournalMessage, ChatMessage } from '@common/game/message';
import { BehaviorSubject } from 'rxjs';

describe('ChampChatComponent', () => {
    let component: ChampChatComponent;
    let fixture: ComponentFixture<ChampChatComponent>;
    let chatServiceSpy: jasmine.SpyObj<ChatService>;

    const mockPlayerName = 'TestPlayer';
    const mockPlayerId = 'player123';
    const mockMessages$ = new BehaviorSubject<ChatMessage>({
        timeStamp: new Date().toISOString(),
        senderName: mockPlayerName,
        senderId: mockPlayerId,
        content: 'Test message',
    });
    const mockJournalMessages$ = new BehaviorSubject<JournalMessage>({
        content: 'Test journal entry',
        timeStamp: new Date().toISOString(),
        involvedPlayers: [mockPlayerId, 'otherPlayer'],
    });
    const mockPlayerName$ = new BehaviorSubject<string>(mockPlayerName);

    beforeEach(async () => {
        chatServiceSpy = jasmine.createSpyObj(
            'ChatService',
            ['sendChatMessage', 'requestLobbyChatHistory', 'resetToLobbyMode', 'getCurrentPlayerId'],
            {
                messages$: mockMessages$,
                journalMessages$: mockJournalMessages$,
                currentPlayerName$: mockPlayerName$,
            },
        );
        chatServiceSpy.getCurrentPlayerId.and.returnValue(mockPlayerId);

        await TestBed.configureTestingModule({
            imports: [ChampChatComponent],
            providers: [{ provide: ChatService, useValue: chatServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(ChampChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('validating messages', () => {
        it('should initialize with correct subscriptions and request chat history', () => {
            expect(component.currentPlayerName).toBe(mockPlayerName);
            expect(component.messages.length).toBe(1);
            expect(component.journalEntries.length).toBe(1);
            expect(component.currentPlayerId).toBe(mockPlayerId);
            expect(chatServiceSpy.requestLobbyChatHistory).toHaveBeenCalled();
        });

        it('should send message when form is valid', () => {
            const testMessage = 'Test message';
            component.newMessage = testMessage;
            component.sendMessage();
            expect(chatServiceSpy.sendChatMessage).toHaveBeenCalledWith(testMessage);
            expect(component.newMessage).toBe('');
        });

        it('should not send message when message is empty', () => {
            component.newMessage = '';
            component.sendMessage();
            expect(chatServiceSpy.sendChatMessage).not.toHaveBeenCalled();
        });
    });

    it('should filter journal entries by player ID', () => {
        component.journalEntries = [
            { content: 'Entry 1', timeStamp: new Date().toISOString(), involvedPlayers: [mockPlayerId, 'other'] },
            { content: 'Entry 2', timeStamp: new Date().toISOString(), involvedPlayers: ['other1', 'other2'] },
            { content: 'Entry 3', timeStamp: new Date().toISOString(), involvedPlayers: [mockPlayerId] },
        ];
        component.filterByPlayerId();
        expect(component.filteredJournalEntries.length).toBe(2);
        expect(component.filteredJournalEntries[0].content).toBe('Entry 1');
        expect(component.filteredJournalEntries[1].content).toBe('Entry 3');
    });

    describe('toggle modes', () => {
        it('should toggle journal mode', () => {
            component.isJournalMode = false;
            component.toggleJournal();
            expect(component.isJournalMode).toBeTrue();
        });

        it('should toggle chat mode', () => {
            component.isJournalMode = true;
            component.toggleChat();
            expect(component.isJournalMode).toBeFalse();
        });

        it('should toggle filtering correctly', () => {
            component.isFiltering = false;
            component.journalEntries = [{ content: 'Entry 1', timeStamp: new Date().toISOString(), involvedPlayers: [mockPlayerId, 'other'] }];
            spyOn(component, 'filterByPlayerId');
            component.toggleFiltering();
            expect(component.isFiltering).toBeTrue();
            expect(component.filterByPlayerId).toHaveBeenCalled();
            (component.filterByPlayerId as jasmine.Spy).calls.reset();
            component.toggleFiltering();
            expect(component.isFiltering).toBeFalse();
            expect(component.filterByPlayerId).not.toHaveBeenCalled();
        });
    });
});
