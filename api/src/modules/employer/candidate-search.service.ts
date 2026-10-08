import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { UserStatus } from '../../common/enums';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { StorageService } from '../storage/storage.service';
import { CandidateUnlock } from '../billing/entities/candidate-unlock.entity';
import { candidateView } from './applications.service';
import { EmployerContext } from './employer-context.service';

export interface CandidateSearch {
  q?: string;
  skillId?: number;
  locationId?: number;
  minExperience?: number;
  page: number;
  limit: number;
}

/** Tìm hồ sơ ứng viên đã bật "cho phép NTD tìm thấy" */
@Injectable()
export class CandidateSearchService {
  constructor(
    private readonly storage: StorageService,
    private readonly ctx: EmployerContext,
    @InjectRepository(CandidateProfile) private readonly profiles: Repository<CandidateProfile>,
    @InjectRepository(CandidateUnlock) private readonly unlocks: Repository<CandidateUnlock>,
  ) {}

  async search(s: CandidateSearch) {
    const qb = this.profiles
      .createQueryBuilder('c')
      .innerJoin('c.user', 'u')
      .leftJoinAndSelect('c.location', 'l')
      .where('c.is_public = 1')
      .andWhere('u.status = :active', { active: UserStatus.ACTIVE });
    if (s.q) {
      const kw = `%${s.q.replace(/[[\]%_]/g, (ch) => `[${ch}]`)}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('c.headline LIKE :kw', { kw })
            .orWhere('c.full_name LIKE :kw')
            .orWhere('c.summary LIKE :kw')
            .orWhere('EXISTS (SELECT 1 FROM candidate_skills cs INNER JOIN skills s ON s.id = cs.skill_id WHERE cs.candidate_id = c.id AND s.name LIKE :kw)'),
        ),
      );
    }
    if (s.skillId) qb.andWhere('EXISTS (SELECT 1 FROM candidate_skills cs WHERE cs.candidate_id = c.id AND cs.skill_id = :sk)', { sk: s.skillId });
    if (s.locationId) qb.andWhere('c.location_id = :loc', { loc: s.locationId });
    if (s.minExperience) qb.andWhere('c.years_of_experience >= :exp', { exp: s.minExperience });

    const [rows, total] = await qb
      .orderBy('c.updated_at', 'DESC')
      .offset((s.page - 1) * s.limit)
      .limit(s.limit)
      .getManyAndCount();

    // Nạp kỹ năng 1 lần
    const withSkills = rows.length
      ? await this.profiles.find({ where: { id: In(rows.map((r) => r.id)) }, relations: { skills: true }, select: { id: true, skills: { id: true, name: true } } })
      : [];
    const skillMap = new Map(withSkills.map((p) => [p.id, p.skills ?? []]));

    return paginate(
      rows.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        headline: c.headline,
        avatarUrl: this.storage.publicUrl(c.avatarUrl),
        location: c.location?.name ?? null,
        yearsOfExperience: c.yearsOfExperience,
        expectedSalary: c.expectedSalary === null ? null : Number(c.expectedSalary),
        skills: (skillMap.get(c.id) ?? []).map((sk) => ({ id: sk.id, name: sk.name })),
        updatedAt: c.updatedAt,
      })),
      total,
      s.page,
      s.limit,
    );
  }

  /**
   * Chi tiết hồ sơ công khai. Thông tin liên hệ (email, SĐT, địa chỉ) chỉ hiện khi
   * công ty đã dùng 1 lượt "mở liên hệ" (gói dịch vụ) cho ứng viên này.
   */
  async detail(userId: number, id: number) {
    const company = await this.ctx.company(userId);
    const c = await this.profiles.findOne({
      where: { id, isPublic: true },
      relations: { user: true, location: true, skills: true, educations: true, experiences: true },
      order: { educations: { startDate: 'DESC' }, experiences: { startDate: 'DESC' } },
    });
    if (!c || c.user.status !== UserStatus.ACTIVE) throw new NotFoundException('Hồ sơ không tồn tại hoặc đã ẩn');
    const unlocked = await this.unlocks.existsBy({ companyId: company.id, candidateId: c.id });
    return {
      ...candidateView(c, this.storage, unlocked),
      contactUnlocked: unlocked,
      credits: { contact: company.contactCredits, planActive: !!company.planExpiresAt && company.planExpiresAt > new Date() },
    };
  }
}
