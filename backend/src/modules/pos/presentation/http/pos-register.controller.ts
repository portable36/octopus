import { Body, Controller, Get, Param, Patch, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RegisterHandler } from '../../application/commands/register.handler';
import type { Register } from '../../domain/aggregates/register.aggregate';
import {
  CreateRegisterRequestDto,
  RegisterResponseDto,
  UpdateRegisterRequestDto,
} from './dto/register.dto';
import { PosExceptionFilter } from './filters/pos-exception.filter';

@ApiTags('pos-registers')
@Controller('pos')
@ApiBearerAuth()
@UseFilters(PosExceptionFilter)
export class PosRegisterController {
  constructor(private readonly registerHandler: RegisterHandler) {}

  @Get('stores/:storeId/registers')
  @ApiOperation({ summary: 'List all registers for a store (store staff / vendor / admin)' })
  async listRegisters(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
  ): Promise<readonly RegisterResponseDto[]> {
    const registers = await this.registerHandler.listRegisters(storeId, user.userId, user.roles);
    return registers.map(this.toResponseDto);
  }

  @Post('stores/:storeId/registers')
  @ApiOperation({ summary: 'Create a new POS register (store manager / vendor owner / admin)' })
  async createRegister(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: CreateRegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const register = await this.registerHandler.createRegister({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      code: body.code,
      name: body.name,
      notes: body.notes,
    });
    return this.toResponseDto(register);
  }

  @Get('stores/:storeId/registers/:registerId')
  @ApiOperation({ summary: 'Get details of a specific POS register' })
  async getRegister(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('registerId') registerId: string,
  ): Promise<RegisterResponseDto> {
    const register = await this.registerHandler.getRegister(
      storeId,
      registerId,
      user.userId,
      user.roles,
    );
    return this.toResponseDto(register);
  }

  @Patch('stores/:storeId/registers/:registerId')
  @ApiOperation({ summary: 'Update name, notes, or status of a POS register' })
  async updateRegister(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('registerId') registerId: string,
    @Body() body: UpdateRegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const register = await this.registerHandler.updateRegister({
      storeId,
      registerId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      name: body.name,
      status: body.status,
      notes: body.notes,
    });
    return this.toResponseDto(register);
  }

  private toResponseDto(register: Register): RegisterResponseDto {
    return {
      id: register.id.value,
      storeId: register.storeId,
      vendorId: register.vendorId,
      code: register.code,
      name: register.name,
      status: register.status,
      notes: register.notes,
      createdAt: register.createdAt.toISOString(),
      updatedAt: register.updatedAt.toISOString(),
    };
  }
}
