import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { DATA_AUDIT_CACHE_TABLE } from "../constant";

@Entity({ name: DATA_AUDIT_CACHE_TABLE })
export class AuditCache {
  @PrimaryGeneratedColumn({
    type: "bigint",
    name: "id"
  })
  id: string;

  @Column("varchar", {
    nullable: false,
    length: 32,
    name: "uuid"
  })
  uuid: string;

  @Column("text", {
    nullable: true,
    name: "extra"
  })
  extra: string | null;

  @Column("varchar", {
    nullable: false,
    name: "audit_table"
  })
  auditTable: string;

  @Column("varchar", {
    nullable: false,
    length: 32,
    name: "uuid_column"
  })
  uuidColumn: string;

  @Column()
  time: Date;

  @Column("varchar", {
    nullable: false,
    length: 32,
    name: "time_column"
  })
  timeColumn: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}