/**
 * Seed dữ liệu: danh mục + tài khoản admin + dữ liệu demo.
 * Chạy: npm run seed   (chạy lại nhiều lần không bị trùng)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { EntityManager, In } from 'typeorm';
import dataSource from '../data-source';
import { slugify } from '../../common/utils/slug';
import { hashPassword } from '../../common/utils/password';
import {
  CompanyRole,
  CompanySize,
  CompanyVerification,
  JobLevel,
  JobStatus,
  JobType,
  UserRole,
} from '../../common/enums';
import { User } from '../../modules/users/entities/user.entity';
import { Category } from '../../modules/catalog/entities/category.entity';
import { Location } from '../../modules/catalog/entities/location.entity';
import { Skill } from '../../modules/catalog/entities/skill.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { EmployerProfile } from '../../modules/companies/entities/employer-profile.entity';
import { CandidateProfile } from '../../modules/candidates/entities/candidate-profile.entity';
import { Job } from '../../modules/jobs/entities/job.entity';
import { CATEGORIES, LOCATIONS, SKILLS } from './seed-data';
import { StaticPage } from '../../modules/content/entities/static-page.entity';
import { DEFAULT_PAGES } from '../../modules/content/pages.service';
import { ServicePlan } from '../../modules/billing/entities/service-plan.entity';
import { FaqArticle } from '../../modules/support/entities/faq-article.entity';
import { FaqAudience } from '../../common/enums';

const DEMO_PASSWORD = 'Demo@123';

async function seedCatalog(m: EntityManager) {
  const catRepo = m.getRepository(Category);
  const existingCats = new Set((await catRepo.find()).map((c) => c.slug));
  const newCats = CATEGORIES.filter((c) => !existingCats.has(slugify(c.name))).map((c) =>
    catRepo.create({ name: c.name, slug: slugify(c.name), icon: c.icon }),
  );
  await catRepo.save(newCats);

  const locRepo = m.getRepository(Location);
  const existingLocs = new Set((await locRepo.find()).map((l) => l.slug));
  const newLocs = LOCATIONS.map((name, i) => ({ name, slug: slugify(name), sortOrder: i + 1 }))
    .filter((l) => !existingLocs.has(l.slug))
    .map((l) => locRepo.create(l));
  await locRepo.save(newLocs);

  const skillRepo = m.getRepository(Skill);
  const existingSkills = new Set((await skillRepo.find()).map((s) => s.slug));
  const newSkills = SKILLS.filter((s) => !existingSkills.has(slugify(s))).map((s) =>
    skillRepo.create({ name: s, slug: slugify(s) }),
  );
  await skillRepo.save(newSkills);

  console.log(
    `  Danh mục: +${newCats.length} ngành, +${newLocs.length} tỉnh/thành, +${newSkills.length} kỹ năng`,
  );
}

async function seedAdmin(m: EntityManager) {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@jobportal.local';
  const password = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin@123');
  const repo = m.getRepository(User);
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    // Đảm bảo hệ thống luôn có ít nhất 1 super admin
    if (!(await repo.exists({ where: { role: UserRole.ADMIN, isSuperAdmin: true } }))) {
      await repo.update(existing.id, { isSuperAdmin: true });
      console.log(`  Admin ${email} được đặt làm super admin`);
    } else {
      console.log(`  Admin ${email} đã tồn tại – bỏ qua`);
    }
    return;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD phải có 8–64 ký tự, gồm chữ và số (bắt buộc khi chạy production)');
  }
  await repo.save(
    repo.create({
      email,
      passwordHash: await hashPassword(password),
      role: UserRole.ADMIN,
      emailVerified: true,
      isSuperAdmin: true,
    }),
  );
  console.log(`  Super admin: ${email}${process.env.NODE_ENV === 'production' ? '' : ` / ${password}`}`);
}

async function seedPages(m: EntityManager) {
  const repo = m.getRepository(StaticPage);
  let added = 0;
  for (const p of DEFAULT_PAGES) {
    if (await repo.existsBy({ slug: p.slug })) continue;
    await repo.insert({ slug: p.slug, title: p.title, content: PAGE_CONTENT[p.slug] ?? `Nội dung trang ${p.title}.` });
    added++;
  }
  console.log(`  Trang tĩnh: +${added}`);
}

const PAGE_CONTENT: Record<string, string> = {
  'gioi-thieu':
    'JobPortal là nền tảng kết nối ứng viên và nhà tuyển dụng.\n\n- Ứng viên: tạo hồ sơ, tải CV, tìm và ứng tuyển việc làm miễn phí.\n- Nhà tuyển dụng: đăng tin, quản lý ứng viên, theo dõi hiệu quả tuyển dụng.\n\nMọi tin tuyển dụng đều được kiểm duyệt trước khi hiển thị.',
  'dieu-khoan':
    'Khi sử dụng JobPortal, bạn đồng ý:\n\n1. Cung cấp thông tin trung thực.\n2. Không đăng tin lừa đảo, thu phí ứng viên dưới mọi hình thức.\n3. Không sử dụng dữ liệu ứng viên cho mục đích ngoài tuyển dụng.\n\nVi phạm có thể dẫn tới gỡ tin hoặc khóa tài khoản.',
  'chinh-sach-bao-mat':
    'Chúng tôi chỉ thu thập thông tin cần thiết cho việc tìm việc và tuyển dụng.\n\n- CV của bạn chỉ được chia sẻ với nhà tuyển dụng bạn ứng tuyển.\n- Hồ sơ chỉ xuất hiện trong mục tìm kiếm khi bạn bật chế độ cho phép.\n- Mật khẩu được mã hóa, không ai (kể cả quản trị viên) xem được.',
};

async function seedDemo(m: EntityManager) {
  const userRepo = m.getRepository(User);
  if (await userRepo.findOne({ where: { email: 'ntd1@demo.local' } })) {
    console.log('  Dữ liệu demo đã có – bỏ qua');
    return;
  }

  const pwd = await hashPassword(DEMO_PASSWORD);
  const loc = async (slug: string) =>
    m.getRepository(Location).findOneByOrFail({ slug });
  const cats = async (names: string[]) =>
    m.getRepository(Category).findBy({ slug: In(names.map(slugify)) });
  const skills = async (names: string[]) =>
    m.getRepository(Skill).findBy({ slug: In(names.map(slugify)) });

  const hn = await loc('ha-noi');
  const hcm = await loc('tp-ho-chi-minh');
  const dn = await loc('da-nang');

  // --- Công ty ---
  const companyRepo = m.getRepository(Company);
  const techCo = await companyRepo.save(
    companyRepo.create({
      name: 'Công ty TNHH Công nghệ Sao Việt (Demo)',
      slug: 'cong-nghe-sao-viet-demo',
      size: CompanySize.S51_200,
      website: 'https://example.com',
      address: 'Tầng 8, 123 Láng Hạ, Đống Đa',
      locationId: hn.id,
      description: 'Công ty phát triển phần mềm cho doanh nghiệp. (Dữ liệu demo)',
      verificationStatus: CompanyVerification.VERIFIED,
      verifiedAt: new Date(),
    }),
  );
  const retailCo = await companyRepo.save(
    companyRepo.create({
      name: 'Công ty CP Thương mại Phương Nam (Demo)',
      slug: 'thuong-mai-phuong-nam-demo',
      size: CompanySize.S201_500,
      address: '45 Nguyễn Huệ, Quận 1',
      locationId: hcm.id,
      description: 'Chuỗi bán lẻ hàng tiêu dùng. (Dữ liệu demo)',
      verificationStatus: CompanyVerification.PENDING,
    }),
  );

  // --- Nhà tuyển dụng ---
  const employers: User[] = [];
  for (const [i, company] of [techCo, retailCo].entries()) {
    const u = await userRepo.save(
      userRepo.create({
        email: `ntd${i + 1}@demo.local`,
        passwordHash: pwd,
        role: UserRole.EMPLOYER,
        emailVerified: true,
      }),
    );
    await m.getRepository(EmployerProfile).save({
      userId: u.id,
      companyId: company.id,
      fullName: i === 0 ? 'Trần Thị HR' : 'Lê Văn Tuyển',
      position: 'Chuyên viên tuyển dụng',
    });
    employers.push(u);
  }

  // --- Ứng viên ---
  const candidates: { email: string; fullName: string; headline: string; skills: string[] }[] = [
    { email: 'uv1@demo.local', fullName: 'Nguyễn Văn An', headline: 'Lập trình viên Frontend', skills: ['React', 'TypeScript', 'HTML/CSS'] },
    { email: 'uv2@demo.local', fullName: 'Phạm Thị Bình', headline: 'Nhân viên Marketing', skills: ['SEO', 'Content Marketing', 'Facebook Ads'] },
  ];
  for (const c of candidates) {
    const u = await userRepo.save(
      userRepo.create({ email: c.email, passwordHash: pwd, role: UserRole.CANDIDATE, emailVerified: true }),
    );
    const profile = m.getRepository(CandidateProfile).create({
      userId: u.id,
      fullName: c.fullName,
      headline: c.headline,
      locationId: hn.id,
      yearsOfExperience: 2,
      isPublic: true,
    });
    profile.skills = await skills(c.skills);
    await m.getRepository(CandidateProfile).save(profile);
  }

  // --- Tin tuyển dụng ---
  const in30Days = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const jobs: Partial<Job>[] = [
    {
      company: techCo, postedById: employers[0].id, title: 'Lập trình viên ReactJS', locationId: hn.id,
      jobType: JobType.FULL_TIME, level: JobLevel.JUNIOR, experienceYears: 1,
      salaryMin: '15000000', salaryMax: '25000000', status: JobStatus.APPROVED,
      categories: await cats(['Công nghệ thông tin']), skills: await skills(['React', 'TypeScript', 'Git']),
    },
    {
      company: techCo, postedById: employers[0].id, title: 'Backend Developer (NestJS)', locationId: hn.id,
      jobType: JobType.FULL_TIME, level: JobLevel.MIDDLE, experienceYears: 2,
      salaryMin: '25000000', salaryMax: '40000000', status: JobStatus.APPROVED,
      categories: await cats(['Công nghệ thông tin']), skills: await skills(['Node.js', 'NestJS', 'SQL Server']),
    },
    {
      company: techCo, postedById: employers[0].id, title: 'Thực tập sinh Tester', locationId: dn.id,
      jobType: JobType.INTERNSHIP, level: JobLevel.INTERN, experienceYears: 0,
      salaryNegotiable: true, status: JobStatus.PENDING,
      categories: await cats(['Công nghệ thông tin']), skills: await skills(['Làm việc nhóm']),
    },
    {
      company: retailCo, postedById: employers[1].id, title: 'Nhân viên Kinh doanh B2B', locationId: hcm.id,
      jobType: JobType.FULL_TIME, level: JobLevel.JUNIOR, experienceYears: 1,
      salaryMin: '10000000', salaryMax: '20000000', status: JobStatus.APPROVED,
      categories: await cats(['Kinh doanh / Bán hàng']), skills: await skills(['Bán hàng B2B', 'Giao tiếp']),
    },
    {
      company: retailCo, postedById: employers[1].id, title: 'Chuyên viên Digital Marketing', locationId: hcm.id,
      jobType: JobType.FULL_TIME, level: JobLevel.MIDDLE, experienceYears: 2,
      salaryMin: '15000000', salaryMax: '22000000', status: JobStatus.APPROVED,
      categories: await cats(['Marketing / Truyền thông']), skills: await skills(['SEO', 'Facebook Ads', 'Content Marketing']),
    },
    {
      company: retailCo, postedById: employers[1].id, title: 'Kế toán tổng hợp (Bán thời gian)', locationId: hcm.id,
      jobType: JobType.PART_TIME, level: JobLevel.JUNIOR, experienceYears: 1,
      salaryNegotiable: true, status: JobStatus.DRAFT,
      categories: await cats(['Kế toán / Kiểm toán']), skills: await skills(['Excel', 'Kế toán thuế']),
    },
  ];

  const jobRepo = m.getRepository(Job);
  for (const j of jobs) {
    const title = j.title!;
    await jobRepo.save(
      jobRepo.create({
        ...j,
        slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`,
        description: `Mô tả công việc cho vị trí ${title}. (Dữ liệu demo)`,
        requirements: '- Có tinh thần trách nhiệm\n- Kỹ năng làm việc nhóm tốt',
        benefits: '- Lương tháng 13\n- Bảo hiểm đầy đủ\n- Du lịch hằng năm',
        quantity: 2,
        deadline: in30Days,
        publishedAt: j.status === JobStatus.APPROVED ? new Date() : null,
      }),
    );
  }

  console.log(`  Demo: 2 công ty, 2 NTD, 2 ứng viên, ${jobs.length} tin tuyển dụng`);
  console.log(`  Tài khoản demo (mật khẩu ${DEMO_PASSWORD}): ntd1@demo.local, ntd2@demo.local, uv1@demo.local, uv2@demo.local`);
}

/** Tài khoản demo thành viên (MEMBER) của công ty Sao Việt — để thử chức năng nhiều NTD/công ty */
async function seedTeamDemo(m: EntityManager) {
  const userRepo = m.getRepository(User);
  if (await userRepo.findOne({ where: { email: 'ntd3@demo.local' } })) return;
  const company = await m.getRepository(Company).findOneBy({ slug: 'cong-nghe-sao-viet-demo' });
  if (!company) return;
  const u = await userRepo.save(
    userRepo.create({ email: 'ntd3@demo.local', passwordHash: await hashPassword(DEMO_PASSWORD), role: UserRole.EMPLOYER, emailVerified: true }),
  );
  await m.getRepository(EmployerProfile).save({
    userId: u.id,
    companyId: company.id,
    companyRole: CompanyRole.MEMBER,
    fullName: 'Phạm Văn Thành Viên',
    position: 'Trưởng nhóm kỹ thuật',
  });
  console.log(`  Demo: ntd3@demo.local là thành viên của ${company.name}`);
}

/** Gói dịch vụ mặc định cho NTD (chỉ tạo nếu chưa có; giá admin sửa được) */
async function seedPlans(m: EntityManager) {
  const repo = m.getRepository(ServicePlan);
  const plans = [
    { code: 'BASIC', name: 'Cơ bản', description: 'Phù hợp doanh nghiệp nhỏ tuyển 1–2 vị trí', price: '990000', durationDays: 30, featuredCredits: 3, contactCredits: 20, sortOrder: 1 },
    { code: 'PRO', name: 'Chuyên nghiệp', description: 'Tuyển dụng thường xuyên, cần tiếp cận nhiều hồ sơ', price: '2490000', durationDays: 30, featuredCredits: 10, contactCredits: 80, sortOrder: 2 },
    { code: 'PREMIUM', name: 'Doanh nghiệp', description: 'Tuyển dụng quy mô lớn trong 3 tháng', price: '5990000', durationDays: 90, featuredCredits: 30, contactCredits: 300, sortOrder: 3 },
  ];
  let added = 0;
  for (const p of plans) {
    if (await repo.existsBy({ code: p.code })) continue;
    await repo.insert({ ...p, isActive: true });
    added++;
  }
  if (added) console.log(`  Gói dịch vụ: thêm ${added} gói`);
}

/** Câu hỏi thường gặp cho trợ lý hỗ trợ (chỉ thêm khi bảng còn trống; admin sửa ở "Hỗ trợ khách hàng") */
async function seedFaqs(m: EntityManager) {
  const repo = m.getRepository(FaqArticle);
  if (await repo.count()) return;
  const A = FaqAudience;
  const items: { question: string; answer: string; keywords: string; audience: FaqAudience }[] = [
    { audience: A.ALL, question: 'Tôi quên mật khẩu thì làm thế nào?', keywords: 'quên mật khẩu, đặt lại mật khẩu, không đăng nhập được, reset', answer: 'Bạn vào trang Đăng nhập → bấm "Quên mật khẩu", nhập email đã đăng ký. Hệ thống gửi link đặt lại mật khẩu (hiệu lực 30 phút, dùng 1 lần). Không thấy email thì kiểm tra thư mục Spam/Quảng cáo.' },
    { audience: A.ALL, question: 'Không nhận được email xác minh tài khoản?', keywords: 'xác minh email, kích hoạt, không nhận email, gửi lại', answer: 'Kiểm tra thư mục Spam/Quảng cáo. Nếu vẫn không có, đăng nhập rồi bấm "Gửi lại email xác minh" trên thanh thông báo màu vàng (tối đa 3 lần / 5 phút). Link xác minh có hiệu lực 24 giờ.' },
    { audience: A.ALL, question: 'Tài khoản của tôi bị khoá, phải làm sao?', keywords: 'bị khoá, khóa tài khoản, không đăng nhập, cấm', answer: 'Tài khoản bị khoá khi vi phạm quy định (ví dụ đăng tin sai sự thật). Bạn vui lòng bấm "Gặp nhân viên" để được kiểm tra và giải đáp lý do cụ thể.' },
    { audience: A.ALL, question: 'Làm sao đổi mật khẩu?', keywords: 'đổi mật khẩu, thay mật khẩu, bảo mật', answer: 'Vào menu tài khoản → "Đổi mật khẩu". Mật khẩu mới 8–64 ký tự, gồm cả chữ và số. Sau khi đổi, các thiết bị khác sẽ bị đăng xuất để đảm bảo an toàn.' },
    { audience: A.CANDIDATE, question: 'Làm sao để ứng tuyển một công việc?', keywords: 'ứng tuyển, nộp hồ sơ, nộp cv, apply, 1 chạm', answer: 'Mở tin tuyển dụng và bấm "⚡ Ứng tuyển 1 chạm" để nộp ngay bằng CV mặc định (chưa có CV thì hệ thống tự tạo CV từ hồ sơ). Muốn chọn CV khác hoặc viết thư giới thiệu, bấm "Chọn CV / viết thư giới thiệu".' },
    { audience: A.CANDIDATE, question: 'Tôi có thể tải lên bao nhiêu CV và định dạng nào?', keywords: 'tải cv, upload cv, định dạng, dung lượng, pdf, word', answer: 'Bạn lưu được tối đa 5 CV, định dạng PDF, DOC hoặc DOCX, mỗi file tối đa 5MB. Quản lý ở mục "CV của tôi"; có thể đặt 1 CV làm mặc định.' },
    { audience: A.CANDIDATE, question: 'Tạo CV online như thế nào?', keywords: 'tạo cv, mẫu cv, cv online, xuất pdf', answer: 'Vào "Tạo CV online": CV được tạo tự động từ "Hồ sơ của tôi". Chọn mẫu (Hiện đại / Cổ điển / Tối giản), màu, thêm chứng chỉ, ngoại ngữ… rồi bấm "Tải PDF" hoặc "Lưu vào CV của tôi" để dùng khi ứng tuyển.' },
    { audience: A.CANDIDATE, question: 'Làm sao rút đơn ứng tuyển?', keywords: 'rút đơn, huỷ ứng tuyển, hủy đơn', answer: 'Vào "Việc đã ứng tuyển" → bấm "Rút đơn". Chỉ rút được khi đơn đang ở trạng thái Đã nộp / Đã xem / Phù hợp. Rút rồi thì không nộp lại vào tin đó được.' },
    { audience: A.CANDIDATE, question: 'Vì sao nhà tuyển dụng chưa phản hồi hồ sơ của tôi?', keywords: 'chưa phản hồi, không trả lời, chờ phản hồi, trạng thái đơn', answer: 'Mỗi nhà tuyển dụng có tốc độ xử lý khác nhau. Bạn xem chỉ số "Phản hồi …% hồ sơ, thường trong … ngày" ở trang tin tuyển dụng, và dùng bộ lọc "⚡ Chỉ NTD phản hồi nhanh" khi tìm việc. Khi trạng thái đơn thay đổi, bạn sẽ nhận thông báo.' },
    { audience: A.CANDIDATE, question: 'Làm sao để nhà tuyển dụng tìm thấy hồ sơ của tôi?', keywords: 'tìm thấy hồ sơ, công khai hồ sơ, nhà tuyển dụng tìm', answer: 'Vào "Hồ sơ của tôi" và bật "Cho phép nhà tuyển dụng tìm thấy hồ sơ". Thông tin liên hệ của bạn chỉ hiện khi nhà tuyển dụng dùng lượt mở liên hệ, và bạn có thể tắt bất cứ lúc nào.' },
    { audience: A.CANDIDATE, question: 'Gặp tin tuyển dụng lừa đảo thì làm gì?', keywords: 'lừa đảo, thu phí, tin giả, báo cáo, vi phạm', answer: 'Tuyệt đối không chuyển tiền đặt cọc / phí hồ sơ cho bất kỳ ai. Bấm "Báo cáo" trên tin tuyển dụng và chọn lý do; quản trị viên sẽ xem xét và gỡ tin nếu vi phạm.' },
    { audience: A.EMPLOYER, question: 'Đăng tin tuyển dụng như thế nào và bao lâu được duyệt?', keywords: 'đăng tin, duyệt tin, chờ duyệt, tin tuyển dụng', answer: 'Vào "Tin tuyển dụng" → "+ Đăng tin mới", điền thông tin rồi bấm "Gửi duyệt". Quản trị viên duyệt trong giờ hành chính; bị từ chối sẽ có lý do để bạn sửa và gửi lại. Cần tạo hồ sơ công ty trước khi đăng tin.' },
    { audience: A.EMPLOYER, question: 'Vì sao tin của tôi phải duyệt lại sau khi sửa?', keywords: 'sửa tin, duyệt lại, chờ duyệt', answer: 'Sửa tiêu đề, mô tả, yêu cầu, quyền lợi, ngành hoặc kỹ năng của tin đang hiển thị thì tin cần duyệt lại. Sửa lương, hạn nộp, số lượng, địa điểm thì không phải duyệt lại.' },
    { audience: A.EMPLOYER, question: 'Xác minh doanh nghiệp như thế nào?', keywords: 'xác minh, giấy phép kinh doanh, tích xanh, verified', answer: 'Vào "Hồ sơ công ty" → "Gửi giấy phép kinh doanh" (PDF/JPG/PNG, tối đa 5MB, cần có mã số thuế). Công ty đã xác minh có dấu ✔ trên tin và trang công ty.' },
    { audience: A.EMPLOYER, question: 'Mua gói dịch vụ và thanh toán thế nào?', keywords: 'mua gói, thanh toán, chuyển khoản, qr, gói dịch vụ, giá', answer: 'Vào "Gói dịch vụ" → chọn gói → "Mua gói". Quét mã QR (đã có sẵn số tiền và nội dung) hoặc chuyển khoản với nội dung là mã đơn. Gói được kích hoạt sau khi quản trị viên xác nhận đã nhận tiền. Chỉ chủ công ty mới mua được gói.' },
    { audience: A.EMPLOYER, question: 'Đã chuyển khoản nhưng gói chưa được kích hoạt?', keywords: 'chưa kích hoạt, đã chuyển khoản, chưa nhận, thanh toán chậm', answer: 'Việc xác nhận thường trong giờ hành chính. Nếu đã quá lâu, bạn bấm "Gặp nhân viên" và gửi mã đơn để được kiểm tra.' },
    { audience: A.EMPLOYER, question: 'Tin nổi bật và lượt mở liên hệ là gì?', keywords: 'tin nổi bật, đẩy tin, mở liên hệ, lượt, credits', answer: 'Mỗi lượt "đẩy tin nổi bật" đưa tin lên đầu kết quả tìm kiếm 7 ngày, có nhãn ★. Mỗi lượt "mở liên hệ" cho xem email, SĐT của một ứng viên trong "Tìm hồ sơ" (mở 1 lần, cả công ty xem được). Lượt chỉ dùng được khi gói còn hạn.' },
    { audience: A.EMPLOYER, question: 'Làm sao mời đồng nghiệp cùng quản lý tuyển dụng?', keywords: 'mời đồng nghiệp, thêm thành viên, đội tuyển dụng, nhiều tài khoản', answer: 'Chủ công ty vào "Đội tuyển dụng" → nhập email đồng nghiệp → "Mời". Người được mời mở link trong email (hiệu lực 7 ngày) để tham gia. Thành viên đăng tin và xử lý hồ sơ được, nhưng không sửa hồ sơ công ty hay mua gói.' },
    { audience: A.EMPLOYER, question: 'Nhãn "Phản hồi nhanh" là gì?', keywords: 'phản hồi nhanh, tỉ lệ phản hồi, nhãn, chỉ số', answer: 'Công ty phản hồi ≥ 80% hồ sơ và trung bình trong 3 ngày (tính trên 90 ngày, từ 5 hồ sơ trở lên) sẽ có nhãn "⚡ Phản hồi nhanh" trên tin. "Phản hồi" là chuyển hồ sơ sang Phù hợp / Phỏng vấn / Offer / Từ chối hoặc nhắn tin cho ứng viên.' },
  ];
  await repo.insert(items.map((it, i) => ({ ...it, isActive: true, sortOrder: i + 1 })));
  console.log(`  FAQ hỗ trợ: thêm ${items.length} câu hỏi`);
}

async function main() {
  await dataSource.initialize();
  console.log('Seeding…');
  await dataSource.transaction(async (m) => {
    await seedCatalog(m);
    await seedAdmin(m);
    await seedPages(m);
    await seedPlans(m);
    await seedFaqs(m);
    if (process.env.SEED_DEMO !== 'false') {
      await seedDemo(m);
      await seedTeamDemo(m);
    }
  });
  await dataSource.destroy();
  console.log('Xong.');
}

main().catch(async (err) => {
  console.error('Seed lỗi:', err);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
