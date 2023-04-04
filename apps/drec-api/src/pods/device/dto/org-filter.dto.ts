import {  IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  OffTaker,
  FuelCode,
  DevicetypeCode
} from '../../../utils/enums';

export class OrgFilterDTO {
  @IsOptional()
  @ApiPropertyOptional({ type: FuelCode, description: 'Fuel Code',enum:FuelCode,isArray:true})
  fuelCode: FuelCode;

  @IsOptional()
  @ApiPropertyOptional({ type: DevicetypeCode, description: 'Device Type Code',enum:DevicetypeCode,isArray:true })
  deviceTypeCode: DevicetypeCode;

  // @IsOptional()
  // @ApiPropertyOptional({
  //   type: Installation,
  //   description: 'Installation configuration',
  //   enum: Installation,
  // })
  // installationConfiguration: Installation;

 

  @IsOptional()
  @ApiPropertyOptional({ description: 'Start date Commissioning Date filter' })
  @IsDateString()
  startDate: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'End date Commissioning Date filter' })
  @IsDateString()
  endDate:string;

  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, description: 'Grid Interconnection' })
  gridInterconnection: boolean;

  @IsOptional()
  @ApiPropertyOptional({
    type: OffTaker,
    description: 'Off-taker',
    enum: OffTaker,
    isArray:true
  })
  offTaker: OffTaker;

  @IsOptional()
  @ApiPropertyOptional({ type: String, description: 'Search devices based on Labels' })
  @IsString()
  labels: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
    description: 'Search number for target from this capacity in KiloWatts',
  })
  fromCapacity: number;


  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
    description: 'Search number for target to this capacity in KiloWatts',
  })
  toCapacity: number;


  @IsOptional()
  @ApiPropertyOptional({ type: String, description: 'CountryCode' })
  @IsString()
  country: string;
}