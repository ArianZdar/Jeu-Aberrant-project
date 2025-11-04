import { GameObjects } from '@common/game/game-enums';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameItemDocument = HydratedDocument<GameItem>;

@Schema()
export class Coordinate {
    @Prop({ required: true })
    x: number;

    @Prop({ required: true })
    y: number;
}

@Schema()
export class GameItem {
    @Prop({ type: Coordinate, required: true })
    position: Coordinate;

    @Prop({ required: true })
    item: GameObjects;
}

export const gameItemSchema = SchemaFactory.createForClass(GameItem);
