import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** id tự tăng + created_at / updated_at (datetime2, giờ UTC). */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt!: Date;
}
