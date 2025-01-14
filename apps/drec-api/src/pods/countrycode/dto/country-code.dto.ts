import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CountryCodeNameDTO {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @Expose()
  country: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @Expose()
  alpha2: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @Expose()
  alpha3: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @Expose()
  numeric: string;
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @Expose()
  countryCode: string;
 
}
