import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { ApplicationStatus, JobStatus, NotificationType } from '../../common/enums';
import { CandidatesService } from '../candidates/candidates.service';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { todayVN } from '../../common/utils/date';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { ApplyDto } from './dto/apply.dto';
import { Application } from './entities/application.entity';

/** Trạng thái mà ứng viên còn được rút đơn */
const WITHDRAWABLE = [ApplicationStatus.SUBMITTED, ApplicationStatus.VIEWED, ApplicationStatus.SHORTLISTED];

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly candidates: CandidatesService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    @InjectRepository(Application) private readonly apps: Repository<Application>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
  ) {}

  async apply(userId: number, dto: ApplyDto) {
    const profile = await this.candidates.getProfileByUser(userId);
    const job = await this.jobs.findOne({ where: { id: dto.jobId }, relations: { company: true } });
    if (!job) throw new NotFoundException('Tin tuyển dụng không tồn tại');
    if (job.status !== JobStatus.APPROVED) throw new BadRequestException('Tin tuyển dụng đã đóng, không thể ứng tuyển');
    if (job.deadline < todayVN()) throw new BadRequestException('Tin tuyển dụng đã hết hạn nộp hồ sơ');

    if (await this.apps.existsBy({ jobId: job.id, candidateId: profile.id })) {
      throw new ConflictException('Bạn đã ứng tuyển vị trí này rồi');
    }
    const resume = await this.candidates.ownResume(userId, dto.resumeId);

    let saved: Application;
    try {
      saved = await this.apps.save(
        this.apps.create({
          jobId: job.id,
          candidateId: profile.id,
          resumeId: resume.id,
          resumeFileName: resume.fileName,
          resumeFileUrl: resume.fileUrl,
          coverLetter: dto.coverLetter ?? null,
          status: ApplicationStatus.SUBMITTED,
          statusChangedAt: new Date(),
        }),
      );
    } catch (err) {
      // Bấm nộp 2 lần cùng lúc -> vướng UNIQUE(job_id, candidate_id)
      if (err instanceof QueryFailedError && /UQ_applications_job_candidate|duplicate/i.test(err.message)) {
        throw new ConflictException('Bạn đã ứng tuyển vị trí này rồi');
      }
      throw err;
    }

    await this.notifyEmployers(job, profile.fullName, saved.id);
    return { id: saved.id, status: saved.status, createdAt: saved.createdAt };
  }

  async listMine(userId: number, page: number, limit: number) {
    const profile = await this.candidates.getProfileByUser(userId);
    const [rows, total] = await this.apps
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.job', 'j')
      .innerJoinAndSelect('j.company', 'c')
      .leftJoinAndSelect('j.location', 'l')
      .where('a.candidate_id = :cid', { cid: profile.id })
      .orderBy('a.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return paginate(
      rows.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt,
        statusChangedAt: a.statusChangedAt,
        resumeFileName: a.resumeFileName,
        coverLetter: a.coverLetter,
        canWithdraw: WITHDRAWABLE.includes(a.status),
        hasMessages: !!a.lastMessageAt,
        unreadMessages: !!a.lastMessageAt && (!a.candidateReadAt || a.candidateReadAt < a.lastMessageAt),
        job: {
          id: a.job.id,
          slug: a.job.slug,
          title: a.job.title,
          status: a.job.status,
          deadline: a.job.deadline,
          location: a.job.location?.name ?? null,
          company: { name: a.job.company.name, slug: a.job.company.slug, logoUrl: this.storage.publicUrl(a.job.company.logoUrl) },
        },
      })),
      total,
      page,
      limit,
    );
  }

  async withdraw(userId: number, id: number) {
    const profile = await this.candidates.getProfileByUser(userId);
    const a = await this.apps.findOneBy({ id, candidateId: profile.id });
    if (!a) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    if (!WITHDRAWABLE.includes(a.status)) {
      throw new BadRequestException('Đơn đã được nhà tuyển dụng xử lý, không thể rút');
    }
    await this.apps.update(id, { status: ApplicationStatus.WITHDRAWN, statusChangedAt: new Date() });
    return { id, status: ApplicationStatus.WITHDRAWN };
  }

  /** Đơn của ứng viên cho 1 job (hiển thị trạng thái ở trang chi tiết) */
  async findMineForJob(userId: number, jobId: number) {
    const profile = await this.candidates.getProfileByUser(userId);
    const a = await this.apps.findOneBy({ jobId, candidateId: profile.id });
    return a ? { id: a.id, status: a.status, createdAt: a.createdAt } : null;
  }

  private async notifyEmployers(job: Job, candidateName: string, applicationId: number) {
    const employers = await this.dataSource
      .getRepository(EmployerProfile)
      .find({ where: { companyId: job.companyId }, select: { userId: true } });
    if (!employers.length) return;
    await this.notifications.create(
      employers.map((e) => ({
        userId: e.userId,
        type: NotificationType.NEW_APPLICATION,
        title: 'Có ứng viên mới',
        message: `${candidateName} vừa ứng tuyển "${job.title}"`,
        link: `/employer/applications/${applicationId}`,
      })),
    );
  }
}
