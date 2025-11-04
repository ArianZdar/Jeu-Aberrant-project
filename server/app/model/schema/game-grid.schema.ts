import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameGridDocument = GameGrid & Document;

@Schema()
export class Tile {
    @Prop({ required: true })
    tileType: string;

    @Prop({ required: true })
    material: string;

    @Prop({ required: true })
    isSpawnPoint: boolean;
}

@Schema()
export class GameGrid {
    @Prop({ type: [[Tile]], required: true })
    tiles: Tile[][];

    @Prop({ required: true })
    size: string;
}

export const tileSchema = SchemaFactory.createForClass(Tile);
export const gameGridSchema = SchemaFactory.createForClass(GameGrid);
