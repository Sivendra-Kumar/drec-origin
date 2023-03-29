import {
  Unit,
} from '@energyweb/energy-api-influxdb';
import {
  IsDate,
  IsOptional,
  IsPositive

} from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class ReadFilterDTO {
  
  @IsOptional()
  @ApiProperty({default: '2020-01-01T00:00:00Z' ,description:'Example : 2020-01-01T00:00:00Z'})
  start: Date;

  @ApiProperty({default:'2020-01-01T00:00:00Z' ,description:'Example : 2020-01-01T00:00:00Z'})
  end: Date;

  @IsOptional()
  @ApiPropertyOptional({ default: 10000 , description: 'Default value : 10000' })
   limit: number;

  @IsOptional()
  @ApiPropertyOptional({ default: 0, description: 'Default value : 0' })
   offset: number;
}