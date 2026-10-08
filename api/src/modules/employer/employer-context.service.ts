import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyRole } from '../../common/enums';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { User } from '../users/entities/user.entity';

/** Lấy hồ sơ NTD + công ty của user đang đăng nhập */
@Injectable()
export class EmployerContext {
  constructor(
    @InjectRepository(EmployerProfile) private readonly profiles: Repository<EmployerProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async profile(userId: number): Promise<EmployerProfile> {
    let p = await this.profiles.findOne({ where: { userId }, relations: { company: true } });
    if (!p) {
      const u = await this.users.findOneBy({ id: userId });
      await this.profiles.insert({ userId, fullName: u?.email ?? 'Nhà tuyển dụng' });
      p = await this.profiles.findOneOrFail({ where: { userId }, relations: { company: true } });
    }
    return p;
  }

  /** Bắt buộc là chủ (OWNER) của công ty */
  async ownerCompany(userId: number): Promise<Company> {
    const p = await this.profile(userId);
    if (!p.company) throw new ForbiddenException('Bạn cần tạo hồ sơ công ty trước');
    if (p.companyRole !== CompanyRole.OWNER) {
      throw new ForbiddenException('Chỉ quản trị viên của công ty mới thực hiện được thao tác này');
    }
    return p.company;
  }

  /** Bắt buộc đã có công ty */
  async company(userId: number): Promise<Company> {
    const p = await this.profile(userId);
    if (!p.company) throw new ForbiddenException('Bạn cần tạo hồ sơ công ty trước');
    return p.company;
  }
}
