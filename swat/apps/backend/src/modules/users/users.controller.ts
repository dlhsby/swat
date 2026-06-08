import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../common/types/api-response';

import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { type CreatedUserDto, type UserDto } from './users.types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'List users (paginated)' })
  list(@Query() query: ListUsersQueryDto): Promise<{ data: UserDto[]; meta: PaginationMeta }> {
    return this.users.list(query);
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Get a user by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.users.getById(id);
  }

  @Post()
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Create a user (issues a temporary password)' })
  create(@Body() dto: CreateUserDto): Promise<CreatedUserDto> {
    return this.users.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto): Promise<UserDto> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @ApiOperation({ summary: 'Soft-delete a user' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.users.remove(id);
  }
}
