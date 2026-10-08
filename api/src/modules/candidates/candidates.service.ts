import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Application } from '../applications/entities/application.entity';
import { Location } from '../catalog/entities/location.entity';
import { Skill } from '../catalog/entities/skill.entity';
import { SettingsService } from '../content/settings.service';
import { User } from '../users/entities/user.entity';
import { FileTokenService } from '../storage/file-token.service';
import { RESUME_RULE, IMAGE_RULE, StorageService, UploadedFileData } from '../storage/storage.service';
import {
  EducationDto,
  ExperienceDto,
  UpdateEducationDto,
  UpdateExperienceDto,
  UpdateProfileDto,
} from './dto/candidate.dto';
import { CandidateProfile, type CvSettings } from './entities/candidate-profile.entity';
import type { CvSettingsDto } from './dto/cv-settings.dto';
import { Education } from './entities/education.entity';
import { Experience } from './entities/experience.entity';
import { Resume } from './entities/resume.entity';


const DEFAULT_CV_SETTINGS: CvSettings = {
  template: 'modern',
  accent: '#2563eb',
  showPhoto: true,
  showBirthDate: false,
  certificates: '',
  languages: '',
  interests: '',
};

@Injectable()
export class CandidatesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
    private readonly fileTokens: FileTokenService,
    @InjectRepository(CandidateProfile) private readonly profiles: Repository<CandidateProfile>,
    @InjectRepository(Education) private readonly educations: Repository<Education>,
    @InjectRepository(Experience) private readonly experiences: Repository<Experience>,
    @InjectRepository(Resume) private readonly resumes: Repository<Resume>,
    @InjectRepository(Skill) private readonly skills: Repository<Skill>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  /** Lấy hồ sơ ứng viên theo user; tự tạo nếu chưa có */
  async getProfileByUser(userId: number): Promise<CandidateProfile> {
    let p = await this.profiles.findOneBy({ userId });
    if (!p) {
      const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
      p = await this.profiles.save(this.profiles.create({ userId, fullName: user?.email ?? 'Ứng viên' }));
    }
    return p;
  }

  // ===== Hồ sơ =====

  async getFullProfile(userId: number) {
    const { id } = await this.getProfileByUser(userId);
    const p = await this.profiles.findOneOrFail({
      where: { id },
      relations: { location: true, skills: true, educations: true, experiences: true },
      order: { educations: { startDate: 'DESC' }, experiences: { startDate: 'DESC' } },
    });
    return this.toView(p);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const p = await this.getProfileByUser(userId);
    if (dto.locationId != null && !(await this.locations.existsBy({ id: dto.locationId }))) {
      throw new BadRequestException('Tỉnh/thành không hợp lệ');
    }
    const { expectedSalary, ...rest } = dto;
    const changes = Object.fromEntries(
      Object.entries({
        ...rest,
        expectedSalary: expectedSalary === undefined ? undefined : expectedSalary === null ? null : String(expectedSalary),
      }).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(changes).length) await this.profiles.update(p.id, changes);
    return this.getFullProfile(userId);
  }

  async updateAvatar(userId: number, file: UploadedFileData | undefined) {
    this.storage.validate(file, IMAGE_RULE);
    const p = await this.getProfileByUser(userId);
    const key = await this.storage.save(file!, 'public/avatars');
    await this.profiles.update(p.id, { avatarUrl: key });
    await this.storage.remove(p.avatarUrl);
    return { avatarUrl: this.storage.publicUrl(key) };
  }

  async updateSkills(userId: number, skillIds: number[]) {
    const p = await this.getProfileByUser(userId);
    const ids = [...new Set(skillIds)];
    const found = ids.length ? await this.skills.findBy({ id: In(ids) }) : [];
    if (found.length !== ids.length) throw new BadRequestException('Có kỹ năng không hợp lệ');
    p.skills = found;
    await this.profiles.save(p);
    return found.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
  }

  // ===== Học vấn / kinh nghiệm =====

  async addEducation(userId: number, dto: EducationDto) {
    const p = await this.getProfileByUser(userId);
    checkRange(dto.startDate, dto.endDate);
    return this.educations.save(this.educations.create({ ...dto, candidateId: p.id }));
  }

  async updateEducation(userId: number, id: number, dto: UpdateEducationDto) {
    const row = await this.ownRow(this.educations, userId, id, 'học vấn');
    checkRange(dto.startDate ?? row.startDate, dto.endDate === undefined ? row.endDate : dto.endDate);
    if (Object.keys(dto).length) await this.educations.update(id, dto);
    return this.educations.findOneByOrFail({ id });
  }

  async removeEducation(userId: number, id: number) {
    await this.ownRow(this.educations, userId, id, 'học vấn');
    await this.educations.delete(id);
  }

  async addExperience(userId: number, dto: ExperienceDto) {
    const p = await this.getProfileByUser(userId);
    checkRange(dto.startDate, dto.endDate);
    return this.experiences.save(this.experiences.create({ ...dto, candidateId: p.id }));
  }

  async updateExperience(userId: number, id: number, dto: UpdateExperienceDto) {
    const row = await this.ownRow(this.experiences, userId, id, 'kinh nghiệm');
    checkRange(dto.startDate ?? row.startDate, dto.endDate === undefined ? row.endDate : dto.endDate);
    if (Object.keys(dto).length) await this.experiences.update(id, dto);
    return this.experiences.findOneByOrFail({ id });
  }

  async removeExperience(userId: number, id: number) {
    await this.ownRow(this.experiences, userId, id, 'kinh nghiệm');
    await this.experiences.delete(id);
  }

  // ===== CV =====

  async listResumes(userId: number) {
    const p = await this.getProfileByUser(userId);
    const rows = await this.resumes.find({ where: { candidateId: p.id }, order: { isDefault: 'DESC', createdAt: 'DESC' } });
    return rows.map(toResumeView);
  }

  // ===== CV online =====

  async getCvSettings(userId: number): Promise<CvSettings> {
    const p = await this.getProfileByUser(userId);
    return { ...DEFAULT_CV_SETTINGS, ...(p.cvSettings ?? {}) };
  }

  async saveCvSettings(userId: number, dto: CvSettingsDto): Promise<CvSettings> {
    const p = await this.getProfileByUser(userId);
    const value: CvSettings = { ...DEFAULT_CV_SETTINGS, ...dto };
    await this.profiles.update(p.id, { cvSettings: value });
    return value;
  }

  async uploadResume(userId: number, file: UploadedFileData | undefined) {
    const { maxResumeMb, maxResumes } = await this.settings.all();
    this.storage.validate(file, { ...RESUME_RULE, maxMb: maxResumeMb });
    const p = await this.getProfileByUser(userId);
    const count = await this.resumes.countBy({ candidateId: p.id });
    if (count >= maxResumes) throw new BadRequestException(`Bạn chỉ được lưu tối đa ${maxResumes} CV`);

    const key = await this.storage.save(file!, 'private/resumes');
    const saved = await this.resumes.save(
      this.resumes.create({
        candidateId: p.id,
        fileName: file!.originalname.slice(0, 255),
        fileUrl: key,
        mimeType: file!.mimetype,
        sizeBytes: file!.size,
        isDefault: count === 0, // CV đầu tiên là mặc định
      }),
    );
    return toResumeView(saved);
  }

  async setDefaultResume(userId: number, id: number) {
    const r = await this.ownResume(userId, id);
    await this.dataSource.transaction(async (m) => {
      await m.update(Resume, { candidateId: r.candidateId }, { isDefault: false });
      await m.update(Resume, { id }, { isDefault: true });
    });
    return this.listResumes(userId);
  }

  async removeResume(userId: number, id: number) {
    const r = await this.ownResume(userId, id);
    await this.dataSource.transaction(async (m) => {
      // Đơn ứng tuyển vẫn giữ bản sao file (resume_file_url) nên chỉ bỏ liên kết
      await m.update(Application, { resumeId: id }, { resumeId: null });
      await m.delete(Resume, id);
      if (r.isDefault) {
        const next = await m.findOne(Resume, { where: { candidateId: r.candidateId }, order: { createdAt: 'DESC' } });
        if (next) await m.update(Resume, next.id, { isDefault: true });
      }
    });
    // Chỉ xoá file khi không còn đơn ứng tuyển nào dùng
    const used = await this.dataSource.getRepository(Application).existsBy({ resumeFileUrl: r.fileUrl });
    if (!used) await this.storage.remove(r.fileUrl);
  }

  /** Cấp link tải CV có chữ ký, sống 5 phút (chỉ chủ sở hữu) */
  async resumeLink(userId: number, id: number) {
    const r = await this.ownResume(userId, id);
    return this.fileTokens.sign({ k: r.fileUrl, n: r.fileName, u: userId });
  }

  async ownResume(userId: number, id: number): Promise<Resume> {
    const p = await this.getProfileByUser(userId);
    const r = await this.resumes.findOneBy({ id, candidateId: p.id });
    if (!r) throw new NotFoundException('Không tìm thấy CV');
    return r;
  }

  // ===== Helpers =====

  private async ownRow<T extends { candidateId: number; startDate: string | null; endDate: string | null }>(
    repo: Repository<T>,
    userId: number,
    id: number,
    label: string,
  ): Promise<T> {
    const p = await this.getProfileByUser(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await repo.findOneBy({ id, candidateId: p.id } as any);
    if (!row) throw new NotFoundException(`Không tìm thấy mục ${label}`);
    return row;
  }

  private toView(p: CandidateProfile) {
    return {
      id: p.id,
      fullName: p.fullName,
      phone: p.phone,
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      locationId: p.locationId,
      location: p.location ? { id: p.location.id, name: p.location.name } : null,
      avatarUrl: this.storage.publicUrl(p.avatarUrl),
      headline: p.headline,
      summary: p.summary,
      yearsOfExperience: p.yearsOfExperience,
      expectedSalary: p.expectedSalary === null ? null : Number(p.expectedSalary),
      isPublic: p.isPublic,
      skills: (p.skills ?? []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      educations: (p.educations ?? []).map(({ candidate: _c, ...e }) => e),
      experiences: (p.experiences ?? []).map(({ candidate: _c, ...e }) => e),
    };
  }
}

function checkRange(start?: string | null, end?: string | null) {
  if (start && end && start > end) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
}

export function toResumeView(r: Resume) {
  return {
    id: r.id,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
  };
}
