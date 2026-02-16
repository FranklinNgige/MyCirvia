import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CirviaService } from './cirvia.service';
import {
  BanMemberDto,
  CreateCirviaDto,
  CreateInviteDto,
  DiscoveryQueryDto,
  JoinCirviaDto,
  MuteMemberDto,
  UpdateMemberRoleDto,
} from './dto/cirvia.dto';

@Controller('/cirvias')
export class CirviaController {
  constructor(private readonly cirviaService: CirviaService) {}

  @Post()
  create(@Body() dto: CreateCirviaDto, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.create(dto, user);
  }

  @Get()
  listPublic(@Query() query: DiscoveryQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.listPublic(query, user);
  }

  @Get('/my')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.listMy(user);
  }

  @Get('/:id')
  getOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.getOne(id, user);
  }

  @Get('/:id/members')
  listMembers(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.listMembers(id, user);
  }

  @Post('/:id/invites')
  createInvite(@Param('id') id: string, @Body() dto: CreateInviteDto, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.createInvite(id, dto, user);
  }

  @Post('/join')
  join(@Body() dto: JoinCirviaDto, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.join(dto, user);
  }

  @Post('/:id/members/:userId/approve')
  approve(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.approveMember(id, userId, user);
  }

  @Delete('/:id/members/:userId')
  kick(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.kickMember(id, userId, user);
  }

  @Post('/:id/members/:userId/ban')
  ban(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: BanMemberDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cirviaService.banMember(id, userId, dto, user);
  }

  @Post('/:id/members/:userId/mute')
  mute(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: MuteMemberDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cirviaService.muteMember(id, userId, dto, user);
  }

  @Post('/:id/members/:userId/unmute')
  unmute(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cirviaService.unmuteMember(id, userId, user);
  }

  @Put('/:id/members/:userId/role')
  updateRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cirviaService.updateRole(id, userId, dto, user);
  }
}
