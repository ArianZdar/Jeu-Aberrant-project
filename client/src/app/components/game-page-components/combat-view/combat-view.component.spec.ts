/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombatService } from '@app/services/combat/combat.service';
import { CombatStateService } from '@app/services/combat-state/combat-state.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { AttackResult } from '@common/player/attack-result';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { mockPlayers } from '@common/player/mock-player';
import { Socket } from 'socket.io-client';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { CombatViewComponent } from './combat-view.component';
import { DAMAGE_ANIMATION_DURATION, VALUE_DISPLAY_DURATION } from '@app/constants/client-constants';
import { GameObjects } from '@common/game/game-enums';

const ATTACK_VALUE = 5;
const DEFENSE_VALUE = 3;
const SHORTER_TIMER_DURATION = 30;
const LONGER_TIMER_DURATION = 60;
interface TestableComponent extends CombatViewComponent {
    triggerEvent(event: string, data?: unknown): void;
}

describe('CombatViewComponent', () => {
    let component: CombatViewComponent;
    let fixture: ComponentFixture<CombatViewComponent>;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;
    let combatServiceMock: jasmine.SpyObj<CombatService>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
    let combatStateServiceMock: jasmine.SpyObj<CombatStateService>;
    let gameGridServiceMock: jasmine.SpyObj<GameGridService>;

    const mockMainPlayer = mockPlayers[0];
    const mockOpponent = mockPlayers[1];

    let combatDataSubject: BehaviorSubject<{ attackerId: string; targetId: string } | null>;
    let mainPlayerInfosSubject: BehaviorSubject<typeof mockMainPlayer | null>;
    let opponentSubject: BehaviorSubject<typeof mockOpponent | null>;
    let isCombatTurnSubject: BehaviorSubject<boolean>;

    beforeEach(async () => {
        playerServiceMock = jasmine.createSpyObj('PlayerService', [
            'getMainPlayerStats',
            'getMainPlayerId',
            'getPlayerById',
            'continueTurn',
            'setPlayers',
            'updatePlayer',
        ]);
        playerServiceMock.getMainPlayerStats.and.returnValue(of(mockMainPlayer));
        playerServiceMock.getMainPlayerId.and.returnValue(mockMainPlayer._id);
        playerServiceMock.getPlayerById.and.callFake((id) => mockPlayers.find((p) => p._id === id));
        playerServiceMock.continueTurn.and.returnValue(false);
        Object.defineProperty(playerServiceMock, 'isCurrentPlayerTurn', {
            get: () => true,
        });
        Object.defineProperty(playerServiceMock, 'players', {
            get: () => mockPlayers,
        });

        combatDataSubject = new BehaviorSubject<{ attackerId: string; targetId: string } | null>(null);
        combatServiceMock = jasmine.createSpyObj('CombatService', [
            'setCombatView',
            'attack',
            'forfeit',
            'setCombatVictoryMessage',
            'opponentDisconnected',
        ]);
        combatServiceMock.forfeit.and.returnValue(Promise.resolve(true));
        Object.defineProperty(combatServiceMock, 'combatData$', {
            get: () => combatDataSubject.asObservable(),
        });

        mainPlayerInfosSubject = new BehaviorSubject<typeof mockMainPlayer | null>(mockMainPlayer);
        opponentSubject = new BehaviorSubject<typeof mockOpponent | null>(mockOpponent);
        isCombatTurnSubject = new BehaviorSubject<boolean>(true);

        combatStateServiceMock = jasmine.createSpyObj('CombatStateService', [
            'resetCombatState',
            'setMainPlayerInfos',
            'setOpponent',
            'setMainPlayerDamaged',
            'setOpponentDamaged',
            'setAttackerDiceType',
            'setDefenderDiceType',
            'setAttackValue',
            'setDefenseValue',
            'setShowAttackValue',
            'setShowDefenseValue',
            'setWinnerName',
            'setShowVictoryMessage',
            'setCombatTimerValue',
            'setIsCombatTurn',
            'setCurrentTurnPlayerId',
            'setEscapeFailed',
            'setIsInitialCombatPhase',
            'setIsMainPlayerAttacker',
            'getOpponent',
        ]);
        combatStateServiceMock.getOpponent.and.returnValue(mockOpponent);

        Object.defineProperty(combatStateServiceMock, 'mainPlayerInfos$', {
            get: () => mainPlayerInfosSubject.asObservable(),
        });
        Object.defineProperty(combatStateServiceMock, 'opponent$', {
            get: () => opponentSubject.asObservable(),
        });
        Object.defineProperty(combatStateServiceMock, 'isCombatTurn$', {
            get: () => isCombatTurnSubject.asObservable(),
        });

        gameGridServiceMock = jasmine.createSpyObj('GameGridService', ['updateReachableTiles']);

        Object.defineProperty(gameGridServiceMock, 'gameId', {
            get: () => 'game1',
        });
        Object.defineProperty(gameGridServiceMock, 'tiles', {
            get: () => [[{ material: 'grass' }]],
        });
        Object.defineProperty(gameGridServiceMock, 'size', {
            get: () => 1,
        });

        type EventCallback = <T = unknown>(data?: T) => void;
        const eventHandlers = new Map<string, EventCallback>();
        gameStateServiceMock = jasmine.createSpyObj('GameStateService', ['on', 'off', 'getPlayers', 'nextTurn', 'getItems']);
        gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve(mockPlayers));
        gameStateServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            eventHandlers.set(event, callback as EventCallback);
            return {} as Socket;
        });

        await TestBed.configureTestingModule({
            imports: [CombatViewComponent],
            providers: [
                { provide: PlayerService, useValue: playerServiceMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: GameStateService, useValue: gameStateServiceMock },
                { provide: CombatStateService, useValue: combatStateServiceMock },
                { provide: GameGridService, useValue: gameGridServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatViewComponent);
        component = fixture.componentInstance;

        (component as TestableComponent).triggerEvent = (event: string, data?: unknown): void => {
            const handler = eventHandlers.get(event);
            if (handler) handler(data);
        };

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should reset combat state on initialization', () => {
        expect(combatStateServiceMock.resetCombatState).toHaveBeenCalled();
    });

    it('should register event listeners on initialization', () => {
        expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.PlayerAttacked, jasmine.any(Function));
        expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.PlayerEscaped, jasmine.any(Function));
        expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.ExecuteAutoAttack, jasmine.any(Function));
    });
    it('should handle PlayerAttacked events', () => {
        const attackResult: AttackResult = {
            attacker: mockMainPlayer,
            target: mockOpponent,
            attackValue: ATTACK_VALUE,
            defenseValue: DEFENSE_VALUE,
        };

        spyOn(component, 'playDamageAnimation');

        (component as TestableComponent).triggerEvent(GameGatewayEvents.PlayerAttacked, attackResult);

        expect(combatStateServiceMock.setIsMainPlayerAttacker).toHaveBeenCalledWith(true);
        expect(combatStateServiceMock.setAttackerDiceType).toHaveBeenCalledWith(mockMainPlayer.attackPower);
        expect(combatStateServiceMock.setDefenderDiceType).toHaveBeenCalledWith(mockOpponent.defensePower);
        expect(combatStateServiceMock.setAttackValue).toHaveBeenCalledWith(ATTACK_VALUE);
        expect(combatStateServiceMock.setDefenseValue).toHaveBeenCalledWith(DEFENSE_VALUE);
        expect(combatStateServiceMock.setShowAttackValue).toHaveBeenCalledWith(true);
        expect(combatStateServiceMock.setShowDefenseValue).toHaveBeenCalledWith(true);
        expect(component.playDamageAnimation).toHaveBeenCalledWith(false, true);
    });

    it('should handle PlayerEscaped events', () => {
        (component as TestableComponent).triggerEvent(GameGatewayEvents.PlayerEscaped);
        expect(combatServiceMock.setCombatView).toHaveBeenCalledWith(false);
    });

    it('should hide attack and defense values after timeout', () => {
        jasmine.clock().install();
        const attackResult: AttackResult = {
            attacker: mockMainPlayer,
            target: mockOpponent,
            attackValue: 5,
            defenseValue: 3,
        };
        spyOn(component, 'playDamageAnimation');
        component.handleAttackEvent(attackResult);
        expect(combatStateServiceMock.setShowAttackValue).toHaveBeenCalledWith(true);
        expect(combatStateServiceMock.setShowDefenseValue).toHaveBeenCalledWith(true);
        combatStateServiceMock.setShowAttackValue.calls.reset();
        combatStateServiceMock.setShowDefenseValue.calls.reset();
        jasmine.clock().tick(VALUE_DISPLAY_DURATION);
        expect(combatStateServiceMock.setShowAttackValue).toHaveBeenCalledWith(false);
        expect(combatStateServiceMock.setShowDefenseValue).toHaveBeenCalledWith(false);

        jasmine.clock().uninstall();
    });

    it('should call nextTurn when main player lost the combat', () => {
        jasmine.clock().install();
        combatServiceMock.setCombatView.calls.reset();
        playerServiceMock.continueTurn.calls.reset();
        gameStateServiceMock.nextTurn.calls.reset();
        const mainPlayerId = mockMainPlayer._id;
        const opponentId = mockOpponent._id;
        playerServiceMock.getMainPlayerId.and.returnValue(mainPlayerId);
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatEnded, { winnerId: opponentId });
        jasmine.clock().tick(1);
        expect(combatServiceMock.setCombatView).toHaveBeenCalledWith(false);
        expect(playerServiceMock.getMainPlayerId).toHaveBeenCalled();
        expect(playerServiceMock.continueTurn).not.toHaveBeenCalled();
        expect(gameStateServiceMock.nextTurn).toHaveBeenCalledWith('game1');
        jasmine.clock().uninstall();
    });

    it('should subscribe to main player stats and update combat state with distinctUntilChanged', () => {
        const playerStatsSubject = new Subject<typeof mockMainPlayer>();
        playerServiceMock.getMainPlayerStats.and.returnValue(playerStatsSubject.asObservable());
        combatStateServiceMock.setMainPlayerInfos.calls.reset();
        component.ngOnInit();
        const initialStats = { ...mockMainPlayer, health: 10 };
        playerStatsSubject.next(initialStats);
        expect(combatStateServiceMock.setMainPlayerInfos).toHaveBeenCalledTimes(1);
        expect(combatStateServiceMock.setMainPlayerInfos).toHaveBeenCalledWith(initialStats);
        combatStateServiceMock.setMainPlayerInfos.calls.reset();
        playerStatsSubject.next(initialStats);
        expect(combatStateServiceMock.setMainPlayerInfos).not.toHaveBeenCalled();
        const updatedStats = { ...mockMainPlayer, health: 5 };
        playerStatsSubject.next(updatedStats);
        expect(combatStateServiceMock.setMainPlayerInfos).toHaveBeenCalledTimes(1);
        expect(combatStateServiceMock.setMainPlayerInfos).toHaveBeenCalledWith(updatedStats);
    });

    it('should update combat timer value when CombatTimerTick event is triggered', () => {
        combatStateServiceMock.setCombatTimerValue.calls.reset();
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatTimerTick, SHORTER_TIMER_DURATION);
        expect(combatStateServiceMock.setCombatTimerValue).toHaveBeenCalledWith(SHORTER_TIMER_DURATION);
    });

    it('should set initial combat timer value when CombatTimerStart event is triggered', () => {
        combatStateServiceMock.setCombatTimerValue.calls.reset();
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatTimerStart, LONGER_TIMER_DURATION);
        expect(combatStateServiceMock.setCombatTimerValue).toHaveBeenCalledWith(LONGER_TIMER_DURATION);
    });

    it('should set combat timer value to null when CombatTimerEnd event is triggered', () => {
        combatStateServiceMock.setCombatTimerValue.calls.reset();
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatTimerEnd);
        expect(combatStateServiceMock.setCombatTimerValue).toHaveBeenCalledWith(null);
    });
    it('should set opponent when main player is not the attacker ', () => {
        const combatData = {
            attackerId: mockOpponent._id,
            targetId: mockMainPlayer._id,
        };

        combatStateServiceMock.setOpponent.calls.reset();
        playerServiceMock.getMainPlayerId.calls.reset();
        playerServiceMock.getPlayerById.calls.reset();
        playerServiceMock.getMainPlayerId.and.returnValue(mockMainPlayer._id);
        playerServiceMock.getPlayerById.and.returnValue(mockOpponent);
        combatDataSubject.next(combatData);
        expect(playerServiceMock.getMainPlayerId).toHaveBeenCalled();
        expect(playerServiceMock.getPlayerById).toHaveBeenCalledWith(mockOpponent._id);
        expect(combatStateServiceMock.setOpponent).toHaveBeenCalledWith(mockOpponent);
    });

    it('should set opponent to null when main player is the attacker and target is not found', () => {
        const combatData = {
            attackerId: mockMainPlayer._id,
            targetId: 'nonexistent-target-id',
        };
        playerServiceMock.setPlayers([mockMainPlayer]);
        combatDataSubject.next(combatData);
        expect(combatStateServiceMock.setOpponent).toHaveBeenCalledWith(null);
    });

    it('should set opponent to null when main player is not the attacker and attacker is not found', () => {
        const combatData = {
            attackerId: 'nonexistent-attacker-id',
            targetId: mockMainPlayer._id,
        };
        playerServiceMock.getPlayerById.and.returnValue(undefined);
        combatDataSubject.next(combatData);
        expect(combatStateServiceMock.setOpponent).toHaveBeenCalledWith(null);
    });

    it('should handle CombatEnded event when winnerId is undefined', () => {
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatEnded, {});

        expect(playerServiceMock.getPlayerById).not.toHaveBeenCalled();
        expect(combatStateServiceMock.setWinnerName).not.toHaveBeenCalled();
        expect(combatStateServiceMock.setShowVictoryMessage).not.toHaveBeenCalled();
        expect(combatServiceMock.setCombatVictoryMessage).not.toHaveBeenCalled();
    });

    it('should handle ExecuteAutoAttack events', () => {
        spyOn(component, 'attack');
        (component as TestableComponent).triggerEvent(GameGatewayEvents.ExecuteAutoAttack);
        expect(component.attack).toHaveBeenCalledWith(true);
    });

    it('should handle CombatEnded events with winner', () => {
        jasmine.clock().install();

        const winner = { winnerId: mockMainPlayer._id };
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatEnded, winner);

        expect(combatStateServiceMock.setWinnerName).toHaveBeenCalledWith(mockMainPlayer.name);
        expect(combatStateServiceMock.setShowVictoryMessage).toHaveBeenCalledWith(true);
        expect(combatServiceMock.setCombatVictoryMessage).toHaveBeenCalledWith(mockMainPlayer.name);

        jasmine.clock().tick(1);
        expect(combatServiceMock.setCombatView).toHaveBeenCalledWith(false);
        expect(playerServiceMock.continueTurn).toHaveBeenCalled();
        expect(gameStateServiceMock.nextTurn).toHaveBeenCalledWith('game1');

        jasmine.clock().uninstall();
    });

    it('should handle CombatTurnChanged events', () => {
        const turnId = mockMainPlayer._id;
        (component as TestableComponent).triggerEvent(GameGatewayEvents.CombatTurnChanged, turnId);

        expect(combatStateServiceMock.setIsInitialCombatPhase).toHaveBeenCalledWith(false);
        expect(combatStateServiceMock.setIsCombatTurn).toHaveBeenCalledWith(true);
        expect(combatStateServiceMock.setCurrentTurnPlayerId).toHaveBeenCalledWith(turnId);
    });

    it('should update combat players when players are updated', async () => {
        spyOn(component, 'updateCombatPlayers');
        (component as TestableComponent).triggerEvent(GameGatewayEvents.PlayersUpdated);
        expect(component.updateCombatPlayers).toHaveBeenCalled();
    });

    it('should update combat state based on combat data', () => {
        const combatData = { attackerId: mockMainPlayer._id, targetId: mockOpponent._id };
        combatDataSubject.next(combatData);

        expect(combatStateServiceMock.setOpponent).toHaveBeenCalled();
    });

    it('should handle attack properly', () => {
        isCombatTurnSubject.next(true);
        opponentSubject.next(mockOpponent);

        component.attack(false);
        expect(combatServiceMock.attack).toHaveBeenCalledWith(false, mockOpponent._id);
    });

    it('should not attack when no opponent or not player turn', () => {
        isCombatTurnSubject.next(false);
        opponentSubject.next(mockOpponent);

        component.attack(false);
        expect(combatServiceMock.attack).not.toHaveBeenCalled();

        isCombatTurnSubject.next(true);
        opponentSubject.next(null);

        component.attack(false);
        expect(combatServiceMock.attack).not.toHaveBeenCalled();
    });

    it('should handle successful forfeit', async () => {
        combatServiceMock.forfeit.and.returnValue(Promise.resolve(true));

        await component.forfeit();

        expect(combatServiceMock.forfeit).toHaveBeenCalledWith(mockOpponent._id);
        expect(combatServiceMock.setCombatView).toHaveBeenCalledWith(false);
        expect(combatStateServiceMock.setEscapeFailed).not.toHaveBeenCalled();
    });

    it('should handle failed forfeit', async () => {
        jasmine.clock().install();
        combatServiceMock.forfeit.and.returnValue(Promise.resolve(false));

        await component.forfeit();

        expect(combatServiceMock.forfeit).toHaveBeenCalledWith(mockOpponent._id);
        expect(combatServiceMock.setCombatView).not.toHaveBeenCalled();
        expect(combatStateServiceMock.setEscapeFailed).toHaveBeenCalledWith(true);

        jasmine.clock().tick(VALUE_DISPLAY_DURATION);
        expect(combatStateServiceMock.setEscapeFailed).toHaveBeenCalledWith(false);

        jasmine.clock().uninstall();
    });

    it('should handle failed forfeit with no opponent (opponent ID is empty string)', async () => {
        jasmine.clock().install();
        combatStateServiceMock.getOpponent.and.returnValue(null);
        combatServiceMock.forfeit.and.returnValue(Promise.resolve(false));
        await component.forfeit();
        expect(combatServiceMock.forfeit).toHaveBeenCalledWith('');
        expect(combatServiceMock.setCombatView).not.toHaveBeenCalled();
        expect(combatStateServiceMock.setEscapeFailed).toHaveBeenCalledWith(true);
        jasmine.clock().tick(VALUE_DISPLAY_DURATION);
        expect(combatStateServiceMock.setEscapeFailed).toHaveBeenCalledWith(false);
        jasmine.clock().uninstall();
    });

    it('should play damage animation for main player', () => {
        jasmine.clock().install();
        component.playDamageAnimation(true, false);
        expect(combatStateServiceMock.setMainPlayerDamaged).toHaveBeenCalledWith(true);
        expect(combatStateServiceMock.setOpponentDamaged).not.toHaveBeenCalled();
        jasmine.clock().tick(DAMAGE_ANIMATION_DURATION);
        expect(combatStateServiceMock.setMainPlayerDamaged).toHaveBeenCalledWith(false);
        jasmine.clock().uninstall();
    });

    it('should play damage animation for opponent', () => {
        jasmine.clock().install();
        component.playDamageAnimation(false, true);
        expect(combatStateServiceMock.setOpponentDamaged).toHaveBeenCalledWith(true);
        expect(combatStateServiceMock.setMainPlayerDamaged).not.toHaveBeenCalled();
        jasmine.clock().tick(DAMAGE_ANIMATION_DURATION);
        expect(combatStateServiceMock.setOpponentDamaged).toHaveBeenCalledWith(false);
        jasmine.clock().uninstall();
    });

    it('should handle successful updateCombatPlayers when both players are connected', async () => {
        gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve(mockPlayers));
        await component.updateCombatPlayers();
        expect(combatStateServiceMock.setMainPlayerInfos).toHaveBeenCalledWith(mockMainPlayer);
        expect(combatStateServiceMock.setOpponent).toHaveBeenCalledWith(mockOpponent);
        expect(combatServiceMock.opponentDisconnected).not.toHaveBeenCalled();
    });

    it('should handle opponent disconnection during updateCombatPlayers', async () => {
        const disconnectedOpponent = { ...mockOpponent, isConnected: false };
        const updatedPlayers = [mockMainPlayer, disconnectedOpponent, mockPlayers[2]];
        gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve(updatedPlayers));
        opponentSubject.next(disconnectedOpponent);
        await component.updateCombatPlayers();
        expect(combatServiceMock.opponentDisconnected).toHaveBeenCalled();
    });

    it('should unregister all event listeners on destroy', () => {
        component.ngOnDestroy();
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.PlayerAttacked);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.CombatEnded);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerTick);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerStart);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerEnd);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTurnChanged);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.PlayerEscaped);
        expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.ExecuteAutoAttack);
        expect(combatStateServiceMock.resetCombatState).toHaveBeenCalled();
    });

    it('should handle attackResult when player is defender', () => {
        const attackResultAsDefender: AttackResult = {
            attacker: mockOpponent,
            target: mockMainPlayer,
            attackValue: 6,
            defenseValue: 4,
        };
        spyOn(component, 'playDamageAnimation');
        playerServiceMock.getMainPlayerId.and.returnValue(mockMainPlayer._id);
        component.handleAttackEvent(attackResultAsDefender);
        expect(combatStateServiceMock.setIsMainPlayerAttacker).toHaveBeenCalledWith(false);
        expect(combatStateServiceMock.setMainPlayerInfos).toHaveBeenCalledWith(mockMainPlayer);
        expect(component.playDamageAnimation).toHaveBeenCalledWith(true, false);
    });

    it('should handle UpdateItems event by updating both players and items', async () => {
        const itemsArray = [{ item: GameObjects.Armor, position: { x: 1, y: 1 } }];

        const itemsSet = new Set(itemsArray);

        gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve(mockPlayers));
        gameStateServiceMock.getItems.and.returnValue(Promise.resolve(itemsSet));

        gameGridServiceMock.setItems = jasmine.createSpy('setItems');

        gameStateServiceMock.getPlayers.calls.reset();
        gameStateServiceMock.getItems.calls.reset();
        playerServiceMock.updatePlayer.calls.reset();

        (component as TestableComponent).triggerEvent(GameGatewayEvents.UpdateItems);

        await fixture.whenStable();

        expect(gameStateServiceMock.getPlayers).toHaveBeenCalled();
        expect(gameStateServiceMock.getItems).toHaveBeenCalled();
        expect(playerServiceMock.updatePlayer).toHaveBeenCalledWith(mockPlayers);
        expect(gameGridServiceMock.setItems).toHaveBeenCalledWith(itemsSet);
    });
});
