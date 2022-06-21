import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  Installation,
  Integrator,
  OffTaker,
  Sector,
  StandardCompliance,
} from '../../../utils/enums';
import { DeviceStatus } from '@energyweb/origin-backend-core';
import { DeviceDescription, IDevice } from '../../../models';

export class DeviceDTO implements IDevice {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiProperty()
  @IsString()
  status: DeviceStatus;

  @ApiProperty()
  @IsNumber()
  organizationId: number;

  @ApiProperty()
  @IsString()
  projectName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  latitude: string;

  @ApiProperty()
  @IsString()
  longitude: string;

  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  zipCode: string;

  @ApiProperty()
  @IsString()
  fuelCode: string;

  @ApiProperty()
  @IsString()
  deviceTypeCode: string;

  @ApiProperty()
  @IsEnum(Installation)
  installationConfiguration: Installation;

  @ApiProperty()
  @IsNumber()
  capacity: number;

  @ApiProperty()
  @IsString()
  commissioningDate: string;

  @ApiProperty()
  @IsBoolean()
  gridInterconnection: boolean;

  @ApiProperty()
  @IsEnum(OffTaker)
  offTaker: OffTaker;

  @ApiProperty()
  @IsEnum(Sector)
  sector: Sector;

  @ApiProperty()
  @IsEnum(StandardCompliance)
  standardCompliance: StandardCompliance;

  @ApiProperty()
  @IsNumber()
  yieldValue: number;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  generatorsIds: number[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  labels: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  impactStory: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  data: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  images: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  integrator?: Integrator;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @IsEnum(DeviceDescription)
  deviceDescription?: DeviceDescription;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  energyStorage: boolean;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  energyStorageCapacity: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  qualityLabels: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  groupId?: number | null;
}
