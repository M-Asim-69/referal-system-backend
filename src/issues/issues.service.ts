import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue } from './issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    private readonly issuesRepo: Repository<Issue>,
  ) {}

  async createIssue(userId: string, dto: CreateIssueDto) {
    const issue = await this.issuesRepo.save(
      this.issuesRepo.create({
        userId,
        email: dto.email,
        mobile: dto.mobile,
        subject: dto.subject,
        message: dto.message,
        status: 'OPEN',
      }),
    );

    return { message: 'Issue submitted successfully', data: issue };
  }

  async getAllIssues(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.issuesRepo.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
    });

    const safeData = data.map((i) => {
      const user = i.user as unknown as Record<string, unknown> | undefined;
      if (!user) return i;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, withdrawPasswordHash, ...safeUser } = user;
      return { ...i, user: safeUser };
    });

    return {
      message: 'Issues fetched successfully',
      data: safeData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getIssueById(id: string) {
    const issue = await this.issuesRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return { message: 'Issue fetched successfully', data: issue };
  }
}
