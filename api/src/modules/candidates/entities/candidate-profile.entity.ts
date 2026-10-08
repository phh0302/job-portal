import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { User } from '../../users/entities/user.entity';
import type { Location } from '../../catalog/entities/location.entity';
import type { Skill } from '../../catalog/entities/skill.entity';
import type { Education } from './education.entity';
import type { Experience } from './experience.entity';
import type { Resume } from './resume.entity';

export interface CvSettings {
  template: 'classic' | 'modern' | 'minimal';
  accent: string;
  showPhoto: boolean;
  showBirthDate: boolean;
  certificates: string;
  languages: string;
  interests: string;
}

@Entity('candidate_profiles')
export class CandidateProfile extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @OneToOne('User', (u: User) => u.candidateProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_candidate_profiles_user' })
  user!: Relation<User>;

  @Column({ name: 'full_name', type: 'nvarchar', length: 150 })
  fullName!: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'location_id', type: 'int', nullable: true })
  locationId!: number | null;

  @ManyToOne('Location', { nullable: true })
  @JoinColumn({ name: 'location_id', foreignKeyConstraintName: 'FK_candidate_profiles_location' })
  location!: Relation<Location> | null;

  @Column({ name: 'avatar_url', type: 'nvarchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  /** Tiêu đề nghề nghiệp, vd: "Lập trình viên Frontend" */
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  headline!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  summary!: string | null;

  @Column({ name: 'years_of_experience', type: 'int', default: 0 })
  yearsOfExperience!: number;

  @Column({ name: 'expected_salary', type: 'decimal', precision: 18, scale: 0, nullable: true })
  expectedSalary!: string | null;

  /** Cho phép nhà tuyển dụng tìm thấy hồ sơ */
  @Column({ name: 'is_public', type: 'bit', default: false })
  isPublic!: boolean;

  /** Cấu hình CV online (mẫu, màu, mục bổ sung) – JSON */
  @Column({ name: 'cv_settings', type: 'simple-json', nullable: true })
  cvSettings!: CvSettings | null;

  @OneToMany('Education', (e: Education) => e.candidate)
  educations?: Relation<Education[]>;

  @OneToMany('Experience', (e: Experience) => e.candidate)
  experiences?: Relation<Experience[]>;

  @OneToMany('Resume', (r: Resume) => r.candidate)
  resumes?: Relation<Resume[]>;

  @ManyToMany('Skill')
  @JoinTable({
    name: 'candidate_skills',
    joinColumn: { name: 'candidate_id', foreignKeyConstraintName: 'FK_candidate_skills_candidate' },
    inverseJoinColumn: { name: 'skill_id', foreignKeyConstraintName: 'FK_candidate_skills_skill' },
  })
  skills?: Relation<Skill[]>;
}
