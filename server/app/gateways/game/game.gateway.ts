import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';
import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatGatewayService } from '@app/services/combat-gateway/combat-gateway.service';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { GameConnectionService } from '@app/services/game-connection/game-connection.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { GridActionService } from '@app/services/grid-action/grid-action.service';
import { ItemManagerService } from '@app/services/item-manager/item-manager.service';
import { TurnGatewayService } from '@app/services/turn-gateway/turn-gateway.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import {
    BotStartCombatInterface,
    GetShortestPathToTileInterface,
    PlayerAttackInterface,
    RebindSocketIdInterface,
    TurnInterface,
} from '@common/events/data-interface';
import { ActionJournalEvents, CommonGatewayEvents, GameGatewayEvents } from '@common/events/gateway-events';
import { GameConfig } from '@common/game/game-config';
import { Coordinate } from '@common/game/game-info';
import { ChatMessage } from '@common/game/message';
import { GameItem } from '@common/grid/grid-state';
import { ShortestPath } from '@common/grid/shortest-path';
import { PlayerMovementInfo } from '@common/player/player-movement-info';
import { Inject } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'game', cors: true })
export class GameGateway {
    @WebSocketServer() server: Server;

    @Inject() private readonly gameManagerService: GameManagerService;
    @Inject() private readonly turnLogicService: TurnLogicService;
    @Inject() private readonly combatGatewayService: CombatGatewayService;
    @Inject() private readonly gridActionService: GridActionService;
    @Inject() private readonly itemManagerService: ItemManagerService;
    @Inject() private readonly gameConnectionService: GameConnectionService;
    @Inject() private readonly turnGatewayService: TurnGatewayService;

    constructor(
        private readonly chatService: ChatService,
        private readonly baseGatewayService: BaseGatewayService,
        private readonly combatTurnLogicService: CombatTurnLogicService,
        private readonly combatLogicService: CombatLogicService,
        private readonly botManagerService: BotManagerService,
    ) {}

    @SubscribeMessage(GameGatewayEvents.StartCombat)
    async startCombat(@ConnectedSocket() socket: Socket, @MessageBody() targetId: string) {
        this.combatGatewayService.startCombatLogic(socket.id, targetId);
    }

    @SubscribeMessage(ActionJournalEvents.InitialTurn)
    sendFirstTurnMessage(@ConnectedSocket() socket: Socket) {
        this.chatService.sendFirstTurnMessage(this.gameManagerService.findGameByPlayerId(socket.id));
    }

    @SubscribeMessage(GameGatewayEvents.BotStartCombat)
    botStartCombat(@MessageBody() data: BotStartCombatInterface) {
        this.combatGatewayService.startCombatLogic(data.botId, data.targetId);
    }

    @SubscribeMessage(GameGatewayEvents.PlayerAttack)
    async playerAttack(@ConnectedSocket() socket: Socket, @MessageBody() data: PlayerAttackInterface) {
        await this.gameManagerService.playerIsAttacking(socket.id, data.targetId, data.isAnAutoAttack);
    }

    @SubscribeMessage(GameGatewayEvents.UseDoor)
    async useDoor(@ConnectedSocket() socket: Socket, @MessageBody() targetDoor: Coordinate) {
        await this.gridActionService.useDoor(socket.id, targetDoor);
    }

    @SubscribeMessage(GameGatewayEvents.BreakWall)
    async breakWall(@ConnectedSocket() socket: Socket, @MessageBody() targetTile: Coordinate) {
        await this.gridActionService.breakWall(socket.id, targetTile);
    }

    @SubscribeMessage(GameGatewayEvents.CreateGame)
    async createGame(@MessageBody() data: GameConfig) {
        return this.gameConnectionService.createGame(data);
    }

    @SubscribeMessage(GameGatewayEvents.TurnStart)
    turnStart(@MessageBody() data: TurnInterface) {
        this.turnGatewayService.turnStart(data);
    }

    @SubscribeMessage(GameGatewayEvents.NextTurn)
    nextTurn(@MessageBody() gameId: string) {
        this.turnGatewayService.nextTurn(gameId);
    }

    @SubscribeMessage(GameGatewayEvents.EndTurn)
    endTurn(@MessageBody() data: TurnInterface) {
        this.turnGatewayService.endTurn(data);
    }

    @SubscribeMessage(GameGatewayEvents.BotTurn)
    botTurn(@MessageBody() data: TurnInterface) {
        this.turnGatewayService.botTurn(data);
    }

    @SubscribeMessage(GameGatewayEvents.JoinGame)
    joinGame(@ConnectedSocket() socket: Socket, @MessageBody() gameId: string) {
        this.gameConnectionService.joinGame(socket, gameId);
    }

    @SubscribeMessage(GameGatewayEvents.GetPlayers)
    getPlayers(@ConnectedSocket() socket: Socket) {
        return this.gameConnectionService.getPlayers(socket);
    }

    @SubscribeMessage(GameGatewayEvents.GetItems)
    getItems(@ConnectedSocket() socket: Socket) {
        return this.itemManagerService.getItems(socket.id);
    }

    @SubscribeMessage(GameGatewayEvents.PickupItem)
    pickupItem(@ConnectedSocket() socket: Socket, @MessageBody() itemPosition: Coordinate) {
        this.itemManagerService.pickupItem(socket.id, itemPosition);
    }

    @SubscribeMessage(GameGatewayEvents.DropItem)
    dropItem(@ConnectedSocket() socket: Socket, @MessageBody() gameItem: GameItem) {
        this.itemManagerService.dropItem(socket.id, gameItem);
    }

    @SubscribeMessage(GameGatewayEvents.GetMapId)
    getMapId(@ConnectedSocket() socket: Socket) {
        return this.gameConnectionService.getMapId(socket);
    }

    @SubscribeMessage(GameGatewayEvents.GetAccessibleTiles)
    getAccessibleTiles(@ConnectedSocket() socket: Socket): Coordinate[] {
        return this.gridActionService.getAccessibleTiles(socket.id);
    }

    @SubscribeMessage(GameGatewayEvents.MovePlayer)
    movePlayer(@MessageBody() data: PlayerMovementInfo) {
        this.gridActionService.movePlayer(data);
    }

    @SubscribeMessage(GameGatewayEvents.GetShortestPathToTile)
    getShortestPathToTile(@MessageBody() data: GetShortestPathToTileInterface): ShortestPath {
        return this.gridActionService.getShortestPathToTile(data);
    }

    @SubscribeMessage(GameGatewayEvents.LeaveGame)
    leaveGame(@ConnectedSocket() socket: Socket) {
        this.gameConnectionService.leaveGame(socket);
    }

    @SubscribeMessage(GameGatewayEvents.AttemptEscape)
    attemptEscape(@ConnectedSocket() socket: Socket, @MessageBody() targetId: string) {
        return this.combatGatewayService.attemptEscape(socket.id, targetId);
    }

    @SubscribeMessage(GameGatewayEvents.RebindSocketId)
    rebindSocketId(@MessageBody() data: RebindSocketIdInterface) {
        this.gameConnectionService.rebindSocketId(data);
    }

    @SubscribeMessage(GameGatewayEvents.EndCombat)
    endCombat(@MessageBody() gameId: string): void {
        this.combatTurnLogicService.endCombat(gameId);
    }

    @SubscribeMessage(GameGatewayEvents.PauseTurnTimer)
    pauseTurnTimer(@MessageBody() gameId: string): void {
        this.turnLogicService.pauseTurnTimer(gameId);
    }

    @SubscribeMessage(GameGatewayEvents.ResumeTurnTimer)
    resumeTurnTimer(@MessageBody() gameId: string): void {
        this.turnLogicService.resumeTurnTimer(gameId);
    }

    @SubscribeMessage(GameGatewayEvents.ToggleDebug)
    toggleDebugMode(@ConnectedSocket() socket: Socket) {
        this.combatGatewayService.toggleDebugMode(socket);
    }

    @SubscribeMessage(GameGatewayEvents.OpponentDisconnected)
    opponentDisconnected(@ConnectedSocket() socket: Socket) {
        this.combatGatewayService.opponentDisconnected(socket.id);
    }

    @SubscribeMessage(CommonGatewayEvents.RoomMessage)
    handleRoomMessage(@ConnectedSocket() socket: Socket, @MessageBody() message: ChatMessage) {
        const playerId = socket.id;
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        this.chatService.handleRoomMessage(game, message);
    }

    @SubscribeMessage(CommonGatewayEvents.ChatHistory)
    handleChatHistory(@ConnectedSocket() socket: Socket, @MessageBody() lobbyId: string) {
        this.chatService.handleChatHistory(socket, lobbyId);
    }

    handleConnection(socket: Socket) {
        this.gameConnectionService.handleConnection(socket);
    }

    handleDisconnect(socket: Socket) {
        this.gameConnectionService.handleDisconnect(socket);
    }

    afterInit() {
        this.turnLogicService.setServer(this.server);
        this.combatTurnLogicService.setServer(this.server);
        this.botManagerService.setServer(this.server);
        this.combatLogicService.setServer(this.server);
        this.gridActionService.setServer(this.server);
        this.chatService.setServer(this.server);
        this.baseGatewayService.setServer(this.server);
        this.combatGatewayService.setServer(this.server);
        this.itemManagerService.setServer(this.server);
        this.gameConnectionService.setServer(this.server);
        this.turnGatewayService.setServer(this.server);
        this.gridActionService.setServer(this.server);
        this.chatService.setServer(this.server);
    }
}
