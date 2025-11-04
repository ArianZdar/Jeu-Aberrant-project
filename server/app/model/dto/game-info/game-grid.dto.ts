import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class TileDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    tileType: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    material: string;

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty()
    isSpawnPoint: boolean;
}

export class GameGridDto {
    @ApiProperty({
        type: () => [TileDto],
        isArray: true,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TileDto)
    tiles: TileDto[][];

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    size: string;
}
