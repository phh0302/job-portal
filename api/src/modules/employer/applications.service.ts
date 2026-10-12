import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { extname } from 'path';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { ApplicationStatus } from '../../common/enums';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { FileTokenService } from '../storage/file-token.service';
import { StorageService } from '../storage/storage.service';
import { EmployerApplicationsQuery, UpdateApplicationStatusDto } from './dto/application.dto';
import { EmployerContext } from './employer-context.service';
import { markResponded } from '../applications/mark-responded';
import { RESPONSE_REMIND_DAYS, RESPONSE_STATUSES } from '../../common/utils/response-stats';

/** Luồng trạng thái hợp lệ (NTD) */
const NEXT: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: [ApplicationStatus.VIEWED, ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  VIEWED: [ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  SHORTLISTED: [ApplicationStatus.INTERVIEW, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  INTERVIEW: [ApplicationStatus.INTERVIEW, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  OFFERED: [ApplicationStatus.REJECTED],
  REJECTED: [ApplicationStatus.SHORTLISTED],
  WITHDRAWN: [],
};

@Injectable()
export class EmployerApplicationsService {
  constructor(
    private readonly ctx: EmployerContext,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly fileTokens: FileTokenService,
    @InjectRepository(Application) private readonly apps: Repository<Application>,
  ) {}

  async list(userId: number, q: EmployerApplicationsQuery) {
    const company = await this.ctx.company(userId);
    const qb = this.apps
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.job', 'j')
      .innerJoinAndSelect('a.candidate', 'c')
      .leftJoinAndSelect('c.location', 'l')
      .where('j.company_id = :cid', { cid: company.id });
    if (q.jobId) qb.andWhere('a.job_id = :jid', { jid: q.jobId });
    if (q.status) qb.andWhere('a.status = :st', { st: q.status });
    if (q.pending) {
      qb.andWhere(`a.responded_at IS NULL AND a.status IN ('SUBMITTED', 'VIEWED') AND a.created_at < DATEADD(day, -${RESPONSE_REMIND_DAYS}, GETDATE())`);
    }
    if (q.q) qb.andWhere('c.full_name LIKE :kw', { kw: `%${q.q.replace(/[[\]%_]/g, (ch) => `[${ch}]`)}%` });

    const [rows, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getManyAndCount();

    return paginate(
      rows.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt,
        hasNote: !!a.employerNote,
        job: { id: a.job.id, title: a.job.title },
        candidate: {
          fullName: a.candidate.fullName,
          headline: a.candidate.headline,
          avatarUrl: this.storage.publicUrl(a.candidate.avatarUrl),
          location: a.candidate.location?.name ?? null,
          yearsOfExperience: a.candidate.yearsOfExperience,
        },
      })),
      total,
      q.page,
      q.limit,
    );
  }

  /** Mở chi tiết đơn: tự chuyển SUBMITTED -> VIEWED */
  async detail(userId: number, id: number) {
    const a = await this.own(userId, id);
    if (a.status === ApplicationStatus.SUBMITTED) {
      await this.changeStatus(a, { status: ApplicationStatus.VIEWED, sendEmail: false });
      a.status = ApplicationStatus.VIEWED;
    }
    const c = await this.apps.manager.findOneOrFail(CandidateProfile, {
      where: { id: a.candidateId },
      relations: { user: true, location: true, skills: true, educations: true, experiences: true },
      order: { educations: { startDate: 'DESC' }, experiences: { startDate: 'DESC' } },
    });
    return {
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      statusChangedAt: a.statusChangedAt,
      coverLetter: a.coverLetter,
      employerNote: a.employerNote,
      resumeFileName: a.resumeFileName,
      resumeIsPdf: extname(a.resumeFileUrl).toLowerCase() === '.pdf',
      nextStatuses: NEXT[a.status],
      job: { id: a.job.id, title: a.job.title, slug: a.job.slug },
      candidate: candidateView(c, this.storage, true),
    };
  }

  async updateStatus(userId: number, id: number, dto: UpdateApplicationStatusDto) {
    const a = await this.own(userId, id);
    if (!NEXT[a.status].includes(dto.status)) {
      throw new BadRequestException(
        a.status === ApplicationStatus.WITHDRAWN ? 'Ứng viên đã rút đơn' : 'Không thể chuyển sang trạng thái này',
      );
    }
    await this.changeStatus(a, dto);
    return this.detail(userId, id);
  }

  async updateNote(userId: number, id: number, note: string | null) {
    await this.own(userId, id);
    await this.apps.update(id, { employerNote: note });
    return { employerNote: note };
  }

  /** Link xem/tải CV có chữ ký — chỉ NTD thuộc công ty nhận đơn */
  async resumeLink(userId: number, id: number) {
    const a = await this.own(userId, id);
    return this.fileTokens.sign({ k: a.resumeFileUrl, n: a.resumeFileName, u: userId });
  }

  private async changeStatus(a: Application, dto: Partial<UpdateApplicationStatusDto> & { status: ApplicationStatus }) {
    await this.apps.update(a.id, { status: dto.status, statusChangedAt: new Date() });
    if ((RESPONSE_STATUSES as readonly string[]).includes(dto.status)) await markResponded(this.apps, a.id);
    const c = await this.apps.manager.findOneOrFail(CandidateProfile, { where: { id: a.candidateId }, relations: { user: true } });
    await this.notifications.notifyApplicationStatus({
      userId: c.userId,
      email: c.user.email,
      candidateName: c.fullName,
      jobTitle: a.job.title,
      companyName: a.job.company.name,
      status: dto.status,
      message: dto.message ?? null,
      interview: dto.interview ?? null,
      sendEmail: dto.sendEmail ?? true,
    });
  }

  private async own(userId: number, id: number) {
    const company = await this.ctx.company(userId);
    const a = await this.apps.findOne({ where: { id }, relations: { job: { company: true } } });
    if (!a || a.job.companyId !== company.id) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    return a;
  }
}

/** Hồ sơ ứng viên hiển thị cho NTD */
export function candidateView(c: CandidateProfile, storage: StorageService, withContact: boolean) {
  return {
    id: c.id,
    fullName: c.fullName,
    headline: c.headline,
    summary: c.summary,
    avatarUrl: storage.publicUrl(c.avatarUrl),
    location: c.location?.name ?? null,
    yearsOfExperience: c.yearsOfExperience,
    expectedSalary: c.expectedSalary === null ? null : Number(c.expectedSalary),
    dateOfBirth: c.dateOfBirth,
    ...(withContact && { email: c.user?.email ?? null, phone: c.phone, address: c.address }),
    skills: (c.skills ?? []).map((s) => ({ id: s.id, name: s.name })),
    educations: (c.educations ?? []).map(({ candidate: _c, ...e }) => e),
    experiences: (c.experiences ?? []).map(({ candidate: _c, ...e }) => e),
  };
}
