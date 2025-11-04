import { ApiProperty } from '@nestjs/swagger';
import { GameGridDto } from './game-grid.dto';
import { GameItemDto } from './game-item.dto';

export class GameInfoResponseDto {
    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    gameMode: string;

    @ApiProperty()
    lastChange: Date;

    @ApiProperty({ type: GameGridDto })
    gameGrid: GameGridDto;

    @ApiProperty({
        type: () => GameItemDto,
        isArray: true,
    })
    items: GameItemDto[];

    @ApiProperty()
    isHidden: boolean;

    @ApiProperty()
    thumbnail: string;
}
