import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** id tự tăng + created_at / updated_at (datetime2, GIỜ MÁY CHỦ – xem typeorm.config: useUTC=false). */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt!: Date;
}
