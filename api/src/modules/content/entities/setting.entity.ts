import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Cấu hình hệ thống dạng key/value (giá trị lưu JSON) */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'nvarchar', length: 100 })
  key!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  value!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt!: Date;
}
