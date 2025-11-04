import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GameGrid, gameGridSchema } from './game-grid.schema';
import { GameItem } from './game-item.schema';

export type GameInfoDocument = HydratedDocument<GameInfo>;

@Schema()
export class GameInfo {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    gameMode: string;

    @Prop({ required: true })
    lastChange: Date;

    @Prop({ type: gameGridSchema, required: true })
    gameGrid: GameGrid;

    @Prop({ type: [GameItem], required: true })
    items: GameItem[];

    @Prop({ required: true })
    isHidden: boolean;

    @Prop({ required: true })
    thumbnail: string;
}

export const gameSchema = SchemaFactory.createForClass(GameInfo);
