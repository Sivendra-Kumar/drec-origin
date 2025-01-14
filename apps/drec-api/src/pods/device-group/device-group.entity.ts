import { ExtendedBaseEntity } from '@energyweb/origin-backend-utils';
import { Column, Entity, PrimaryGeneratedColumn,CreateDateColumn } from 'typeorm';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { IDeviceGroup, IFullOrganization } from '../../models';
import {
  CapacityRange,
  CommissioningDateRange,
  Installation,
  OffTaker,
  Sector,
  StandardCompliance,
} from '../../utils/enums';
import { Device } from '../device';

@Entity()
export class DeviceGroup extends ExtendedBaseEntity implements IDeviceGroup {
  @PrimaryGeneratedColumn()
  id: number;
 
  @PrimaryGeneratedColumn('uuid')
  devicegroup_uid: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @Column()
  organizationId: number;

  @Column()
  @IsString()
  fuelCode: string;

  @Column()
  @IsString()
  countryCode: string;

  @Column({ type: 'enum', enum: StandardCompliance })
  @IsEnum(StandardCompliance)
  @IsOptional()
  standardCompliance: StandardCompliance;

  @Column('text', { array: true })
  deviceTypeCodes: string[];

  @Column('text', { array: true })
  offTakers: OffTaker[];

  @Column('text', { array: true })
  @IsOptional()
  installationConfigurations: Installation[];

  @Column('text', { array: true })
  @IsOptional()
  sectors: Sector[];

  @Column('text', { array: true })
  commissioningDateRange: CommissioningDateRange[];

  @Column()
  @IsBoolean()
  gridInterconnection: boolean;

  @Column()
  @IsNumber()
  aggregatedCapacity: number;

  @Column('text')
  @IsEnum(CapacityRange)
  capacityRange: CapacityRange;

  @Column({ default: 1000 })
  @IsNumber()
  yieldValue: number;

  @Column('simple-array', { nullable: true })
  @IsOptional()
  labels: string[];

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  buyerId!: number | null;

  @Column({ type: 'text', nullable: true })
  @IsString()
  buyerAddress!: string | null;

  @Column({
    type: 'float',
    default: 0.0,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  leftoverReads: number;

  @Column({
    type: 'json'
  })
  @IsOptional()
  leftoverReadsByCountryCode: any;

  devices?: Device[];
  organization?: Pick<IFullOrganization, 'name' | 'blockchainAccountAddress'>;

  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  frequency: string | null;

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  @IsOptional()
  targetVolumeInMegaWattHour: number ;

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  @IsOptional()
  targetVolumeCertificateGenerationSucceededInMegaWattHour: number ;

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  @IsOptional()
  targetVolumeCertificateGenerationRequestedInMegaWattHour: number;

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  @IsOptional()
  targetVolumeCertificateGenerationFailedInMegaWattHour: number ;

  @Column({ type: 'boolean', nullable: true })
  @IsNumber()
  @IsOptional()
  authorityToExceed: boolean ;


  @CreateDateColumn({ 
    type: 'timestamp', 
    precision: 3
  })
  reservationStartDate:Date;

  @CreateDateColumn({ 
    type: 'timestamp', 
    precision: 3
  })
  reservationEndDate:Date;

}
