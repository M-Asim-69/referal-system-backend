import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../users/user.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { IssuesService } from './issues.service';

@ApiTags('Issues')
@ApiBearerAuth()
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an issue (support ticket)' })
  @ApiResponse({ status: 201, description: 'Issue submitted' })
  create(@CurrentUser() user: User, @Body() dto: CreateIssueDto) {
    return this.issuesService.createIssue(user.id, dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all issues (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated issues' })
  getAll(@Query() pagination: PaginationDto) {
    return this.issuesService.getAllIssues(pagination);
  }
}
