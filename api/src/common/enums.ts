/** Các enum dùng chung. SQL Server không có kiểu ENUM → TypeORM lưu NVARCHAR + CHECK (simple-enum). */

export enum UserRole {
  CANDIDATE = 'CANDIDATE',
  EMPLOYER = 'EMPLOYER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
}

export enum CompanyVerification {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum CompanySize {
  S1_10 = '1-10',
  S11_50 = '11-50',
  S51_200 = '51-200',
  S201_500 = '201-500',
  S501_1000 = '501-1000',
  S1000_PLUS = '1000+',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  REMOTE = 'REMOTE',
  INTERNSHIP = 'INTERNSHIP',
  CONTRACT = 'CONTRACT',
}

export enum JobLevel {
  INTERN = 'INTERN',
  FRESHER = 'FRESHER',
  JUNIOR = 'JUNIOR',
  MIDDLE = 'MIDDLE',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
}

export enum JobStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
  EXPIRED = 'EXPIRED',
}

export enum ApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  VIEWED = 'VIEWED',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW = 'INTERVIEW',
  OFFERED = 'OFFERED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum AlertFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum NotificationType {
  APPLICATION_STATUS = 'APPLICATION_STATUS',
  NEW_APPLICATION = 'NEW_APPLICATION',
  JOB_APPROVED = 'JOB_APPROVED',
  JOB_REJECTED = 'JOB_REJECTED',
  COMPANY_VERIFIED = 'COMPANY_VERIFIED',
  COMPANY_REJECTED = 'COMPANY_REJECTED',
  JOB_ALERT = 'JOB_ALERT',
  NEW_MESSAGE = 'NEW_MESSAGE',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  SUPPORT = 'SUPPORT',
  SYSTEM = 'SYSTEM',
}

export enum ReportTargetType {
  JOB = 'JOB',
  COMPANY = 'COMPANY',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum UserTokenType {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

/** Vai trò của NTD trong công ty */
export enum CompanyRole {
  /** Quản lý hồ sơ công ty, xác minh, đội ngũ */
  OWNER = 'OWNER',
  /** Đăng tin & xử lý ứng viên */
  MEMBER = 'MEMBER',
}

/** Trạng thái kiểm duyệt đánh giá công ty */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Quan hệ của người đánh giá với công ty */
export enum ReviewRelation {
  CURRENT_EMPLOYEE = 'CURRENT_EMPLOYEE',
  FORMER_EMPLOYEE = 'FORMER_EMPLOYEE',
  INTERVIEWED = 'INTERVIEWED',
}

/** Đơn mua gói dịch vụ */
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

/** Hội thoại hỗ trợ khách hàng */
export enum SupportStatus {
  /** Chỉ đang nói chuyện với trợ lý tự động */
  BOT = 'BOT',
  /** Đã chuyển nhân viên, đang chờ admin trả lời */
  WAITING = 'WAITING',
  /** Admin đã tham gia */
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum SupportSender {
  USER = 'USER',
  BOT = 'BOT',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum FaqAudience {
  ALL = 'ALL',
  CANDIDATE = 'CANDIDATE',
  EMPLOYER = 'EMPLOYER',
}
