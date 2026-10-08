import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyRole, CompanyVerification, NotificationType } from '../../common/enums';
import { slugify } from '../../common/utils/slug';
import { Location } from '../catalog/entities/location.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { FileRule, IMAGE_RULE, StorageService, UploadedFileData } from '../storage/storage.service';
import { CompanyDto, EmployerProfileDto, UpdateCompanyDto } from './dto/company.dto';
import { EmployerContext } from './employer-context.service';

const LICENSE_RULE: FileRule = {
  exts: ['.pdf', '.jpg', '.jpeg', '.png'],
  mimes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxMb: 5,
  label: 'file PDF, JPG hoặc PNG',
};

@Injectable()
export class EmployerCompanyService {
  constructor(
    private readonly ctx: EmployerContext,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(EmployerProfile) private readonly profiles: Repository<EmployerProfile>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  async me(userId: number) {
    const p = await this.ctx.profile(userId);
    return {
      profile: { fullName: p.fullName, phone: p.phone, position: p.position, companyRole: p.companyId ? p.companyRole : null },
      company: p.companyId ? await this.view(p.companyId) : null,
    };
  }

  async updateProfile(userId: number, dto: EmployerProfileDto) {
    const p = await this.ctx.profile(userId);
    if (Object.keys(dto).length) await this.profiles.update(p.id, dto);
    return this.me(userId);
  }

  async create(userId: number, dto: CompanyDto) {
    const p = await this.ctx.profile(userId);
    if (p.companyId) throw new ConflictException('Bạn đã có hồ sơ công ty');
    await this.checkLocation(dto.locationId);
    const company = await this.companies.save(
      this.companies.create({ ...dto, slug: await this.uniqueSlug(dto.name) }),
    );
    await this.profiles.update(p.id, { companyId: company.id, companyRole: CompanyRole.OWNER });
    return this.view(company.id);
  }

  async update(userId: number, dto: UpdateCompanyDto) {
    const c = await this.ctx.ownerCompany(userId);
    await this.checkLocation(dto.locationId);
    // Công ty đã xác minh / đang chờ duyệt: không cho đổi tên & MST (đổi cần xác minh lại)
    const locked = c.verificationStatus === CompanyVerification.VERIFIED || c.verificationStatus === CompanyVerification.PENDING;
    if (locked && ((dto.name && dto.name !== c.name) || (dto.taxCode !== undefined && dto.taxCode !== c.taxCode))) {
      throw new BadRequestException('Công ty đã gửi xác minh nên không thể đổi tên hoặc mã số thuế. Liên hệ quản trị viên nếu cần.');
    }
    if (Object.keys(dto).length) await this.companies.update(c.id, dto);
    return this.view(c.id);
  }

  async uploadImage(userId: number, kind: 'logo' | 'cover', file: UploadedFileData | undefined) {
    this.storage.validate(file, { ...IMAGE_RULE, maxMb: kind === 'cover' ? 3 : 2 });
    const c = await this.ctx.ownerCompany(userId);
    const key = await this.storage.save(file!, kind === 'logo' ? 'public/logos' : 'public/covers');
    const field = kind === 'logo' ? 'logoUrl' : 'coverUrl';
    await this.companies.update(c.id, { [field]: key });
    await this.storage.remove(c[field]);
    return this.view(c.id);
  }

  /** Gửi giấy phép kinh doanh để admin xác minh */
  async requestVerification(userId: number, file: UploadedFileData | undefined) {
    const c = await this.ctx.ownerCompany(userId);
    if (c.verificationStatus === CompanyVerification.VERIFIED) throw new BadRequestException('Công ty đã được xác minh');
    if (c.verificationStatus === CompanyVerification.PENDING) throw new BadRequestException('Yêu cầu xác minh đang chờ duyệt');
    if (!c.taxCode) throw new BadRequestException('Vui lòng cập nhật mã số thuế trước khi gửi xác minh');
    this.storage.validate(file, LICENSE_RULE);

    const key = await this.storage.save(file!, 'private/licenses');
    await this.companies.update(c.id, {
      licenseUrl: key,
      verificationStatus: CompanyVerification.PENDING,
      verificationNote: null,
    });
    await this.storage.remove(c.licenseUrl);
    await this.notifications.notifyAdmins({
      type: NotificationType.SYSTEM,
      title: 'Yêu cầu xác minh công ty',
      message: c.name,
      link: '/admin/companies?status=PENDING',
    });
    return this.view(c.id);
  }

  async view(companyId: number) {
    const c = await this.companies.findOneOrFail({ where: { id: companyId }, relations: { location: true } });
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      taxCode: c.taxCode,
      size: c.size,
      website: c.website,
      address: c.address,
      locationId: c.locationId,
      location: c.location?.name ?? null,
      description: c.description,
      logoUrl: this.storage.publicUrl(c.logoUrl),
      coverUrl: this.storage.publicUrl(c.coverUrl),
      verificationStatus: c.verificationStatus,
      verificationNote: c.verificationNote,
      hasLicense: !!c.licenseUrl,
      verifiedAt: c.verifiedAt,
    };
  }

  private async checkLocation(id: number | null | undefined) {
    if (id && !(await this.locations.existsBy({ id }))) throw new BadRequestException('Tỉnh/thành không hợp lệ');
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name).slice(0, 200) || 'cong-ty';
    let slug = base;
    for (let i = 2; await this.companies.existsBy({ slug }); i++) slug = `${base}-${i}`;
    return slug;
  }
}
