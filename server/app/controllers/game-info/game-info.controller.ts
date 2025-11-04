import { GameInfoResponseDto } from '@app/model/dto/game-info/game-info-response.dto';
import { CreateGameInfoDto, UpdateGameInfoDto } from '@app/model/dto/game-info/game-info.dto';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('game-info')
@Controller('game-info')
export class GameInfoController {
    constructor(private readonly gameInfoService: GameInfoService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new game' })
    @ApiResponse({ status: 201, description: 'Game successfully created', type: GameInfoResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async create(@Body() createGameInfoDto: CreateGameInfoDto): Promise<GameInfoResponseDto> {
        return this.gameInfoService.create(createGameInfoDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Find a game by ID' })
    @ApiResponse({ status: 200, description: 'Game found', type: GameInfoResponseDto })
    @ApiResponse({ status: 404, description: 'Game not found' })
    async find(@Param('id') id: string): Promise<GameInfoResponseDto> {
        return this.gameInfoService.find(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a game by ID' })
    @ApiResponse({ status: 200, description: 'Game successfully updated', type: GameInfoResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    async update(@Param('id') id: string, @Body() updateGameInfoDto: UpdateGameInfoDto): Promise<GameInfoResponseDto> {
        return this.gameInfoService.update(id, updateGameInfoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a game by ID' })
    @ApiResponse({ status: 204, description: 'Game successfully deleted' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    async delete(@Param('id') id: string): Promise<void> {
        return this.gameInfoService.delete(id);
    }

    @Get()
    @ApiOperation({ summary: 'Retrieve all games' })
    @ApiResponse({ status: 200, description: 'List of all games', type: [GameInfoResponseDto] })
    async findAll(): Promise<GameInfoResponseDto[]> {
        return this.gameInfoService.findAll();
    }
}
