import { ExtendedBaseEntity } from '@energyweb/origin-backend-utils';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import {
  IsEnum,
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
} from 'class-validator';

export enum StatusCSV {
  Added = 'Added',
  Running = 'Running',
  Completed = 'Completed',
}

@Entity('device_csv_file_processing_jobs')
export class DeviceCsvFileProcessingJobsEntity extends ExtendedBaseEntity {
  constructor() {
    super();
  }

  @PrimaryGeneratedColumn()
  jobId: number;

  @Column()
  @IsString()
  fileId: string;

  @Column()
  @IsNumber()
  userId: number;

  @Column()
  @IsNumber()
  organizationId: number;

  @Column()
  @IsEnum(StatusCSV)
  status: StatusCSV;
}
