import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { SupportSender } from '../../../common/enums';
import type { SupportTicket } from './support-ticket.entity';

@Entity('support_messages')
@Index('IX_support_messages_ticket', ['ticketId', 'id'])
export class SupportMessage {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'ticket_id', type: 'int' })
  ticketId!: number;

  @ManyToOne('SupportTicket', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id', foreignKeyConstraintName: 'FK_support_messages_ticket' })
  ticket!: Relation<SupportTicket>;

  @Column({ name: 'sender_type', type: 'simple-enum', enum: SupportSender, length: 10 })
  senderType!: SupportSender;

  /** Người gửi (USER / ADMIN); null với BOT / SYSTEM. Không FK để tránh nhiều đường cascade */
  @Column({ name: 'sender_user_id', type: 'int', nullable: true })
  senderUserId!: number | null;

  @Column({ type: 'nvarchar', length: 4000 })
  body!: string;

  /** FAQ mà trợ lý dùng để trả lời (để hiện "Xem thêm") – danh sách id, JSON */
  @Column({ name: 'faq_ids', type: 'nvarchar', length: 200, nullable: true })
  faqIds!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
