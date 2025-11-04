import { LobbyGateway } from '@app/gateways/lobby/lobby.gateway';
import { BotCombatService } from '@app/services/bot-logic/bot-combat/bot-combat.service';
import { GameLogicService } from '@app/services/game-logic/game-logic.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { RoomGeneratorService } from '@app/services/room-generator/room-generator.service';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GameGateway } from './gateways/game/game.gateway';
import { GameInfoModule } from './modules/game-info.module';
import { BaseGatewayService } from './services/base-gateway/base-gateway.service';
import { BotBehaviorService } from './services/bot-logic/bot-behavior/bot-behavior.service';
import { BotCreationService } from './services/bot-logic/bot-creation/bot-creation.service';
import { BotItemService } from './services/bot-logic/bot-item/bot-item.service';
import { BotManagerService } from './services/bot-logic/bot-manager/bot-manager.service';
import { BotMovementService } from './services/bot-logic/bot-movement/bot-movement.service';
import { BotUtilsService } from './services/bot-logic/bot-utils/bot-utils.service';
import { ChatService } from './services/chat/chat.service';
import { CombatGatewayService } from './services/combat-gateway/combat-gateway.service';
import { CombatLogicService } from './services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from './services/combat-turn-logic/combat-turn-logic.service';
import { GameConnectionService } from './services/game-connection/game-connection.service';
import { GridActionService } from './services/grid-action/grid-action.service';
import { ItemBehaviorService } from './services/item-behavior/item-behavior-service';
import { ItemManagerService } from './services/item-manager/item-manager.service';
import { TurnGatewayService } from './services/turn-gateway/turn-gateway.service';
import { TurnLogicService } from './services/turn-logic/turn-logic.service';
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('DATABASE_CONNECTION_STRING'), // Loaded from .env
            }),
        }),
        GameInfoModule,
    ],
    controllers: [],
    providers: [
        LobbyGateway,
        RoomGeneratorService,
        Logger,
        BaseGatewayService,
        GameGateway,
        GameManagerService,
        GameLogicService,
        CombatLogicService,
        TurnLogicService,
        CombatTurnLogicService,
        BotManagerService,
        ItemBehaviorService,
        BotBehaviorService,
        BotCreationService,
        BotMovementService,
        BotCombatService,
        BotItemService,
        BotUtilsService,
        ChatService,
        CombatGatewayService,
        GameConnectionService,
        GridActionService,
        ItemManagerService,
        TurnGatewayService,
    ],
})
export class AppModule {}
