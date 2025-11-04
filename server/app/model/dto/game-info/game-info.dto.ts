import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GameGridDto } from './game-grid.dto';
import { GameItemDto } from './game-item.dto';

export class CreateGameInfoDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsString()
    gameMode: string;

    @ApiProperty()
    lastChange: Date;

    @ApiProperty()
    @Type(() => GameGridDto)
    gameGrid: GameGridDto;

    @ApiProperty({
        type: () => GameItemDto,
        isArray: true,
    })
    items: GameItemDto[];

    @ApiProperty()
    @IsBoolean()
    isHidden: boolean;

    @ApiProperty()
    thumbnail: string;
}

export class UpdateGameInfoDto {
    @ApiProperty()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    gameMode?: string;

    @ApiProperty()
    @IsNotEmpty()
    lastChange?: Date;

    @ApiProperty()
    @IsOptional()
    @Type(() => GameGridDto)
    gameGrid?: GameGridDto;

    @ApiProperty({
        type: () => GameItemDto,
        isArray: true,
    })
    @IsOptional()
    items?: GameItemDto[];

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean;

    @ApiProperty()
    @IsOptional()
    thumbnail?: string;
}
