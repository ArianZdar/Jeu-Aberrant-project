import { WORD_MAX_LENGTH } from '@app/constants/server-constants';
import { Lobby } from '@app/model/class/lobby/lobby';
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';
import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { RoomGeneratorService } from '@app/services/room-generator/room-generator.service';
import { CommonGatewayEvents, LobbyGatewayEvents } from '@common/events/gateway-events';
import { ChatMessage } from '@common/game/message';
import { ChampionSelectedInterface, CreateGameInterface } from '@common/events/data-interface';
import { PlayerInfo } from '@common/player/player-info';
import { Injectable } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/lobby', cors: true })
@Injectable()
export class LobbyGateway implements OnGatewayInit, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private lobbys: Map<string, Lobby> = new Map();

    constructor(
        private readonly baseGatewayService: BaseGatewayService,
        private readonly roomGeneratorService: RoomGeneratorService,
        private readonly botManagerService: BotManagerService,
    ) {
        this.baseGatewayService.setNamespace('/lobby');
    }

    @SubscribeMessage(LobbyGatewayEvents.CreateRoom)
    createRoom(socket: Socket, data: CreateGameInterface) {
        const pin = this.roomGeneratorService.generateRoom();

        const newLobby = new Lobby(data.mapId, pin, data.maxPlayers, data.isLocked);
        this.lobbys.set(pin, newLobby);
        this.baseGatewayService.joinChatRoom(pin);
        socket.join(pin);
    }

    @SubscribeMessage(LobbyGatewayEvents.SubmitChampSelect)
    finishChampionSelection(socket: Socket, playerInfo: PlayerInfo) {
        const lobby = this.findLobby(socket);
        if (lobby) {
            playerInfo._id = socket.id;

            const playerExists = lobby.hasPlayer(playerInfo._id);
            if (!playerExists && lobby.isLocked()) {
                this.server.to(socket.id).emit(LobbyGatewayEvents.ChampSelectError, {
                    message: 'La partie est verrouillée.',
                });
                return;
            }

            const isChampionTaken = lobby.isChampionIndexTaken(playerInfo.championIndex, playerInfo._id);
            if (isChampionTaken) {
                this.server.to(socket.id).emit(LobbyGatewayEvents.ChampSelectError, {
                    message: 'Ce champion est déjà pris par un autre joueur.',
                });
                return;
            }

            const isNameTakenByOthers = lobby.getPlayers().some((player) => player.name === playerInfo.name && player._id !== playerInfo._id);
            if (isNameTakenByOthers) {
                const baseName = playerInfo.name;
                const nameRegex = new RegExp(`^${baseName}-(\\d+)$`);

                let maxNumber = 2;
                lobby.getPlayers().forEach((player) => {
                    const match = player.name.match(nameRegex);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num >= maxNumber) {
                            maxNumber = num + 1;
                        }
                    }
                });

                playerInfo.name = `${baseName}-${maxNumber}`;
                lobby.updatePlayer(playerInfo);
            }

            if (lobby.hasPlayer(playerInfo._id)) {
                lobby.updatePlayer(playerInfo);
            } else {
                if (lobby.isLobbyEmpty()) {
                    playerInfo.isLeader = true;
                }
                lobby.addPlayer(playerInfo);
            }
            this.server.to(socket.id).emit(LobbyGatewayEvents.ChampSelectSubmitted, lobby);
            this.server.to(lobby.getCode()).emit(LobbyGatewayEvents.PlayerJoined, lobby);
        }
    }

    @SubscribeMessage(LobbyGatewayEvents.ToggleLockLobby)
    toggleLockLobby(socket: Socket, isLocked: boolean) {
        const lobby = this.findLobby(socket);
        if (lobby) {
            lobby.setLocked(isLocked);
            this.server.to(lobby.getCode()).emit(LobbyGatewayEvents.LobbyLockChanged, lobby);
        }
    }

    @SubscribeMessage(LobbyGatewayEvents.JoinLobby)
    joinLobby(socket: Socket, pin: string) {
        const roomExists = this.lobbys.has(pin);

        if (!roomExists) {
            socket.emit(LobbyGatewayEvents.ErrorLobby, { hasJoinedLobby: false });
            return;
        }

        this.baseGatewayService.joinSpecificRoom(socket, pin);
        const lobby = this.lobbys.get(pin);
        socket.emit(LobbyGatewayEvents.JoinLobby, { hasJoinedLobby: true, lobby });

        const lobbyOldMessages = this.baseGatewayService.getMessagesFromRoom(pin);
        if (lobbyOldMessages && lobbyOldMessages.messages.length > 0) {
            socket.emit(CommonGatewayEvents.ChatHistory, lobbyOldMessages.messages);
        } else {
            socket.emit(CommonGatewayEvents.ChatHistory, []);
        }
    }

    @SubscribeMessage(LobbyGatewayEvents.IsLobbyFull)
    isLobbyFull(socket: Socket, playerInfo: PlayerInfo) {
        const lobby = this.findLobby(socket);

        if (!lobby) {
            return;
        }

        if (lobby.hasPlayer(playerInfo._id)) {
            socket.emit(LobbyGatewayEvents.IsLobbyFull, false);
            return;
        }

        const existingPlayerWithSameName = lobby.getPlayers().find((player) => player.name === playerInfo.name);
        if (existingPlayerWithSameName) {
            socket.emit(LobbyGatewayEvents.IsLobbyFull, false);
            return;
        }

        const isLobbyFull = lobby.isLobbyFull();
        socket.emit(LobbyGatewayEvents.IsLobbyFull, isLobbyFull);
    }

    @SubscribeMessage(LobbyGatewayEvents.IsLobbyLocked)
    isLobbyLocked(socket: Socket, playerInfo: PlayerInfo) {
        const lobby = this.findLobby(socket);
        if (!lobby) return;

        if (lobby.hasPlayer(playerInfo._id)) {
            socket.emit(LobbyGatewayEvents.IsLobbyLocked, false);
            return;
        }

        if (lobby) {
            const isLobbyLocked = lobby.isLocked();
            socket.emit(LobbyGatewayEvents.IsLobbyLocked, isLobbyLocked);
        }
    }

    @SubscribeMessage(LobbyGatewayEvents.LeaveLobby)
    leaveLobby(socket: Socket) {
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });
        this.lobbys.forEach((lobby, roomId) => {
            if (lobby.hasPlayer(socket.id)) {
                const player = lobby.getPlayer(socket.id);
                const isLeader = player.isLeader;
                lobby.removePlayer(socket.id);
                if (isLeader) {
                    this.server.to(roomId).emit(LobbyGatewayEvents.LeaderLeft, lobby);
                } else {
                    this.server.to(roomId).emit(LobbyGatewayEvents.PlayerLeft, lobby);
                    lobby.removeSelectedChampionIndex(player.championIndex);
                    const championsIndex = lobby.getSelectedChampionIndex();
                    socket.to(roomId).emit(LobbyGatewayEvents.ChampionSelected, {
                        championsIndex,
                    });
                }
            }

            if (lobby.isLobbyEmpty()) {
                this.lobbys.delete(roomId);
            }
        });
    }

    @SubscribeMessage(LobbyGatewayEvents.KickPlayer)
    kickPlayer(socket: Socket, playerName: string) {
        const lobby = this.findLobby(socket);
        if (lobby) {
            const player = lobby.getPlayerByName(playerName);
            if (player) {
                if (player.isBot) {
                    lobby.removePlayer(player._id);
                    this.server.to(lobby.getCode()).emit(LobbyGatewayEvents.PlayerLeft, lobby);
                    lobby.removeSelectedChampionIndex(player.championIndex);
                    const championsIndex = lobby.getSelectedChampionIndex();
                    socket.to(lobby.getCode()).emit(LobbyGatewayEvents.ChampionSelected, {
                        championsIndex,
                    });
                }
                this.server.to(player._id).emit(LobbyGatewayEvents.Kicked);
                this.server.to(lobby.getCode()).emit(LobbyGatewayEvents.KickPlayer, lobby);
            }
        }
    }

    @SubscribeMessage(LobbyGatewayEvents.ChampionSelected)
    championSelected(socket: Socket, data: ChampionSelectedInterface) {
        const lobby = this.findLobby(socket);
        if (!lobby) return;

        if (data.oldIndex !== undefined) {
            lobby.removeSelectedChampionIndex(data.oldIndex);
        }
        if (data.index !== -1) {
            lobby.addSelectedChampionIndex(data.index);
        }

        const championsIndex = lobby.getSelectedChampionIndex();

        socket.to(lobby.getCode()).emit(LobbyGatewayEvents.ChampionSelected, {
            championsIndex,
        });
    }

    @SubscribeMessage(LobbyGatewayEvents.ChampionDeselected)
    championDeselected(socket: Socket) {
        const lobby = this.findLobby(socket);
        if (!lobby) return;
        const player = lobby.getPlayer(socket.id);

        const championIndex = player.championIndex;
        lobby.removeSelectedChampionIndex(championIndex);
        const championsIndex = lobby.getSelectedChampionIndex();

        socket.to(lobby.getCode()).emit(LobbyGatewayEvents.ChampionSelected, {
            championsIndex,
        });
    }

    @SubscribeMessage(LobbyGatewayEvents.GetSelectedChampions)
    getSelectedChampions(socket: Socket) {
        const lobby = this.findLobby(socket);
        if (!lobby) return;

        const championsIndex = lobby.getSelectedChampionIndex();
        socket.emit(LobbyGatewayEvents.ChampionSelected, {
            championsIndex,
        });
    }

    @SubscribeMessage(LobbyGatewayEvents.AddBot)
    addBot(socket: Socket, isAggressive: boolean) {
        const lobby = this.findLobby(socket);
        if (!lobby) return;
        const bot = this.botManagerService.createBot(lobby, isAggressive);
        const botChampionIndex = bot.championIndex;
        lobby.addPlayer(bot);
        lobby.addSelectedChampionIndex(botChampionIndex);
        socket.to(lobby.getCode()).emit(LobbyGatewayEvents.ChampionSelected, {
            botChampionIndex,
        });
        this.server.to(lobby.getCode()).emit(LobbyGatewayEvents.BotAdded, lobby);
    }

    @SubscribeMessage(LobbyGatewayEvents.StartGame)
    startGame(socket: Socket) {
        const lobbyRoom = Array.from(socket.rooms).filter((roomId) => roomId !== socket.id);
        if (lobbyRoom.length === 0) return;
        const currentRoomId = lobbyRoom[0];
        this.server.to(currentRoomId).emit(LobbyGatewayEvents.StartGame);
    }

    @SubscribeMessage(CommonGatewayEvents.RoomMessage)
    handleRoomMessage(@ConnectedSocket() socket: Socket, @MessageBody() message: ChatMessage) {
        const lobbyRoom = Array.from(socket.rooms).filter((roomId) => roomId !== socket.id);
        if (lobbyRoom.length === 0) {
            return;
        }
        const currentRoomId = lobbyRoom[0];
        const trimContent = message.content.length > WORD_MAX_LENGTH ? message.content.substring(0, WORD_MAX_LENGTH) : message.content;
        message.content = trimContent;
        this.baseGatewayService.addMessageToRoom(currentRoomId, message);
        this.server.to(currentRoomId).emit(CommonGatewayEvents.RoomMessage, message);
    }

    @SubscribeMessage(CommonGatewayEvents.ChatHistory)
    handleChatHistory(@ConnectedSocket() socket: Socket, @MessageBody() lobbyId: string) {
        if (!lobbyId) return { messages: [] };
        const lobbyMessages = this.baseGatewayService.getMessagesFromRoom(lobbyId);
        if (lobbyMessages && lobbyMessages.messages.length > 0) {
            socket.emit(CommonGatewayEvents.ChatHistory, lobbyMessages.messages);
        }
    }

    handleDisconnect(socket: Socket) {
        this.leaveLobby(socket);
    }

    afterInit() {
        this.baseGatewayService.setServer(this.server);
    }

    private findLobby(socket: Socket): Lobby | undefined {
        let lobby: Lobby | undefined;
        lobby = undefined;
        const lobbyRoom = Array.from(socket.rooms).filter((roomId) => roomId !== socket.id);
        if (lobbyRoom.length === 0) return lobby;
        const currentRoomId = lobbyRoom[0];
        lobby = this.lobbys.get(currentRoomId);
        return lobby;
    }
}
