import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { COMBAT_END_DELAY } from '@app/constants/client-constants';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { Teams } from '@common/game/game-enums';
import { Player } from '@common/player/player';
import { BehaviorSubject } from 'rxjs';
import { CombatService } from './combat.service';

describe('CombatService', () => {
    let service: CombatService;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;
    let combatDataSubject: BehaviorSubject<{ attackerId: string; targetId: string } | null>;

    const mockMainPlayer: Player = {
        _id: 'player1',
        name: 'Player 1',
        championName: 'beast',
        healthPower: 6,
        maxHealthPower: 6,
        attackPower: 6,
        defensePower: 6,
        speed: 3,
        maxSpeed: 3,
        actionPoints: 2,
        maxActionPoints: 2,
        position: { x: 0, y: 0 },
        spawnPointPosition: { x: 0, y: 0 },
        isWinner: false,
        isBot: false,
        isAggressive: false,
        isLeader: true,
        isTurn: true,
        nbFightsWon: 0,
        isConnected: true,
        isCombatTurn: false,
        escapesAttempts: 0,
        team: Teams.None,
        hasFlag: false,
        items: [],
        buffs: { attackBuff: 0, defenseBuff: 0 },
        activeBuffs: [],
        isInCombat: false,
    };

    beforeEach(() => {
        combatDataSubject = new BehaviorSubject<{ attackerId: string; targetId: string } | null>(null);

        gameStateServiceMock = jasmine.createSpyObj(
            'GameStateService',
            ['opponentDisconnected', 'startCombat', 'attack', 'forfeitCombat', 'getPlayers'],
            {
                combatData$: combatDataSubject.asObservable(),
            },
        );

        gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve([]));

        playerServiceMock = jasmine.createSpyObj('PlayerService', ['getMainPlayerId', 'getMainPlayer', 'updatePlayer']);
        playerServiceMock.getMainPlayerId.and.returnValue('player1');
        playerServiceMock.getMainPlayer.and.returnValue(mockMainPlayer);

        TestBed.configureTestingModule({
            providers: [
                CombatService,
                { provide: GameStateService, useValue: gameStateServiceMock },
                { provide: PlayerService, useValue: playerServiceMock },
            ],
        });

        service = TestBed.inject(CombatService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Observables initialization', () => {
        it('should initialize observables correctly', () => {
            let showCombatView = false;
            let attackMode = false;
            let combatData = null;

            service.showCombatView$.subscribe((val) => (showCombatView = val));
            service.attackMode$.subscribe((val) => (attackMode = val));
            service.combatData$.subscribe((val) => (combatData = val));

            expect(showCombatView).toBeFalse();
            expect(attackMode).toBeFalse();
            expect(combatData).toBeNull();
        });

        it('should set combat view to true when combat data is received for main player', () => {
            let showCombatView = false;
            service.showCombatView$.subscribe((val) => (showCombatView = val));

            combatDataSubject.next({ attackerId: 'player1', targetId: 'player2' });

            expect(showCombatView).toBeTrue();
        });

        it('should set combat view to true when main player is the target', () => {
            let showCombatView = false;
            service.showCombatView$.subscribe((val) => (showCombatView = val));

            combatDataSubject.next({ attackerId: 'player2', targetId: 'player1' });

            expect(showCombatView).toBeTrue();
        });

        it('should not change combat view when combat data does not involve main player', () => {
            let showCombatView = false;
            service.showCombatView$.subscribe((val) => (showCombatView = val));

            combatDataSubject.next({ attackerId: 'player2', targetId: 'player3' });

            expect(showCombatView).toBeFalse();
        });
    });

    describe('Combat view methods', () => {
        it('should toggle combat view', () => {
            let showCombatView = false;
            service.showCombatView$.subscribe((val) => (showCombatView = val));

            service.toggleCombatView();
            expect(showCombatView).toBeTrue();

            service.toggleCombatView();
            expect(showCombatView).toBeFalse();
        });

        it('should notify opponent disconnected', () => {
            service.opponentDisconnected();
            expect(gameStateServiceMock.opponentDisconnected).toHaveBeenCalled();
        });

        it('should set combat view and update players', async () => {
            let showCombatView = false;
            service.showCombatView$.subscribe((val) => (showCombatView = val));

            const players = [mockMainPlayer];
            gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve(players));

            await service.setCombatView(true);

            expect(showCombatView).toBeTrue();
            expect(gameStateServiceMock.getPlayers).toHaveBeenCalled();
            expect(playerServiceMock.updatePlayer).toHaveBeenCalledWith(players);
        });

        it('should return correct combat view value', () => {
            expect(service.getCombatViewValue()).toBeFalse();

            service.setCombatView(true);
            expect(service.getCombatViewValue()).toBeTrue();
        });
    });

    describe('Attack mode methods', () => {
        it('should toggle attack mode', () => {
            let attackMode = false;
            service.attackMode$.subscribe((val) => (attackMode = val));

            service.toggleAttackMode();
            expect(attackMode).toBeTrue();

            service.toggleAttackMode();
            expect(attackMode).toBeFalse();
        });

        it('should not toggle attack mode when player has no action points', () => {
            const playerWithNoActionPoints = { ...mockMainPlayer, actionPoints: 0 };
            playerServiceMock.getMainPlayer.and.returnValue(playerWithNoActionPoints);

            let attackMode = false;
            service.attackMode$.subscribe((val) => (attackMode = val));

            service.toggleAttackMode();
            expect(attackMode).toBeFalse();
        });

        it('should not toggle attack mode when player is not defined', () => {
            playerServiceMock.getMainPlayer.and.returnValue(undefined);

            let attackMode = false;
            service.attackMode$.subscribe((val) => (attackMode = val));

            service.toggleAttackMode();
            expect(attackMode).toBeFalse();
        });

        it('should set attack mode', () => {
            let attackMode = false;
            service.attackMode$.subscribe((val) => (attackMode = val));

            service.setAttackMode(true);
            expect(attackMode).toBeTrue();

            service.setAttackMode(false);
            expect(attackMode).toBeFalse();
        });

        it('should return correct attack mode value', () => {
            expect(service.getAttackModeValue()).toBeFalse();

            service.setAttackMode(true);
            expect(service.getAttackModeValue()).toBeTrue();
        });
    });

    describe('Combat actions', () => {
        it('should start combat with target', async () => {
            await service.startCombat('player2');
            expect(gameStateServiceMock.startCombat).toHaveBeenCalledWith('player2');
        });

        it('should not start combat with self', async () => {
            await service.startCombat('player1');
            expect(gameStateServiceMock.startCombat).not.toHaveBeenCalled();
        });

        it('should attack target', () => {
            service.attack(false, 'player2');
            expect(gameStateServiceMock.attack).toHaveBeenCalledWith(false, 'player2');
        });

        it('should forfeit combat', async () => {
            gameStateServiceMock.forfeitCombat.and.returnValue(Promise.resolve(true));

            const result = await service.forfeit('player2');

            expect(result).toBeTrue();
            expect(gameStateServiceMock.forfeitCombat).toHaveBeenCalledWith('player2');
        });
    });

    describe('Victory message methods', () => {
        it('should set victory message correctly', () => {
            let victoryMessage: { winnerName: string; show: boolean } | null = null as { winnerName: string; show: boolean } | null;
            service.combatVictoryMessage$.subscribe((val) => (victoryMessage = val));

            service.setCombatVictoryMessage('Player 1');

            expect(victoryMessage).toBeTruthy();
            expect(victoryMessage?.winnerName).toBe('Player 1');
            expect(victoryMessage?.show).toBeTrue();
        });

        it('should hide victory message when calling hideCombatVictoryMessage', () => {
            let victoryMessage: { winnerName: string; show: boolean } | null = null;
            service.combatVictoryMessage$.subscribe((val) => (victoryMessage = val));

            service.setCombatVictoryMessage('Player 1');
            expect(victoryMessage).not.toBeNull();

            service.hideCombatVictoryMessage();
            expect(victoryMessage).toBeNull();
        });

        it('should automatically hide victory message after delay', fakeAsync(() => {
            let victoryMessage: { winnerName: string; show: boolean } | null = null;
            service.combatVictoryMessage$.subscribe((val) => (victoryMessage = val));

            service.setCombatVictoryMessage('Player 1');
            expect(victoryMessage).not.toBeNull();

            tick(COMBAT_END_DELAY);

            expect(victoryMessage).toBeNull();
        }));

        it('should include victory message in reset', () => {
            let victoryMessage: { winnerName: string; show: boolean } | null = null;
            service.combatVictoryMessage$.subscribe((val) => (victoryMessage = val));

            service.setCombatVictoryMessage('Player 1');
            expect(victoryMessage).not.toBeNull();

            service.reset();
            expect(victoryMessage).toBeNull();
        });
    });

    describe('Reset', () => {
        it('should reset all state', () => {
            service.setCombatView(true);
            service.setAttackMode(true);

            let showCombatView = true;
            let attackMode = true;
            let combatData: { attackerId: string; targetId: string } | null = { attackerId: 'player1', targetId: 'player2' };

            service.showCombatView$.subscribe((val) => (showCombatView = val));
            service.attackMode$.subscribe((val) => (attackMode = val));
            service.combatData$.subscribe((val) => (combatData = val));

            service.reset();

            expect(showCombatView).toBeFalse();
            expect(attackMode).toBeFalse();
            expect(combatData).toBeNull();
        });
    });
});
