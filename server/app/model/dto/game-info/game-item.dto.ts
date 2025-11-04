import { GameObjects } from '@common/game/game-enums';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class CoordinateDto {
    @ApiProperty()
    @IsNotEmpty()
    x: number;

    @ApiProperty()
    @IsNotEmpty()
    y: number;
}

export class GameItemDto {
    @ApiProperty()
    @Type(() => CoordinateDto)
    position: CoordinateDto;

    @ApiProperty()
    item: GameObjects;
}
