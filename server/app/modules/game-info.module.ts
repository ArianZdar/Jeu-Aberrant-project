import { GameInfoController } from '@app/controllers/game-info/game-info.controller';
import { GameInfo, gameSchema } from '@app/model/schema/game-info.schema';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [MongooseModule.forFeature([{ name: GameInfo.name, schema: gameSchema }])],
    exports: [GameInfoService],
    controllers: [GameInfoController],
    providers: [GameInfoService],
})
export class GameInfoModule {}
