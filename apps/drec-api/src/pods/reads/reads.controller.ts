import {
  AggregateFilterDTO,
  BaseReadsController,
  FilterDTO,
  AggregatedReadDTO,
  ReadDTO,
  ReadsService as BaseReadsService,
  MeasurementDTO,
} from '@energyweb/energy-api-influxdb';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
  ConflictException,
  HttpException
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { ApiBearerAuth, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { BASE_READ_SERVICE } from './const';
import { ReadsService } from './reads.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../user/decorators/roles.decorator';
import { RolesGuard } from '../../guards/RolesGuard';
import { Role } from '../../utils/enums';
import { NewIntmediateMeterReadDTO } from '../reads/dto/intermediate_meter_read.dto'
import { Device, DeviceService } from '../device';
import moment from 'moment';
import { UserDecorator } from '../user/decorators/user.decorator';
import { ILoggedInUser } from '../../models';
import { DeviceDTO } from '../device/dto';
import { ReadType } from '../../utils/enums';
import { isValidUTCDateFormat } from '../../utils/checkForISOStringFormat';
import * as momentTimeZone from 'moment-timezone';
import { Iintermediate, NewReadDTO } from '../../models';
import { ReadFilterDTO } from './dto/filter.dto'
import { filterNoOffLimit } from './dto/filter-no-off-limit.dto';

@Controller('meter-reads')
@ApiBearerAuth('access-token')
@ApiTags('meter-reads')
export class ReadsController extends BaseReadsController {
  constructor(
    private internalReadsService: ReadsService,
    private deviceService: DeviceService,
    @Inject(BASE_READ_SERVICE)
    baseReadsService: BaseReadsService,
  ) {
    super(baseReadsService);
  }

  @Get('/time-zones')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns valid time-zones list',
  })
  getTimezones(
    @Query('timezoneSearchKeyword') searchKeyword?: string): string[] {
    if (searchKeyword) {
      return momentTimeZone.tz.names().filter(timezone => timezone.toLowerCase().includes(searchKeyword.toLowerCase()));
    } else {
      return momentTimeZone.tz.names();
    }
  }


  @Get('/:externalId')
  @ApiResponse({
    status: HttpStatus.OK,
    type: [ReadDTO],
    description: 'Returns time-series of meter reads',
  })
  @UseGuards(AuthGuard('jwt'))
  public async getReads(
    @Param('externalId') meterId: string,
    @Query() filter: FilterDTO,
    // @UserDecorator() user: ILoggedInUser,
  ): Promise<ReadDTO[]> {
    let device: DeviceDTO | null = await this.deviceService.findReads(meterId);

    if (device === null) {

      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `Invalid device id`,
          })
        );
      });
    }
    return super.getReads(device.externalId, filter);
  }
/* */
@Get('new/:externalId') 

  @ApiQuery({ name: 'Month',type:Number,required:false})
  @ApiQuery({ name: 'Year',type:Number,required:false})

  @ApiQuery({ name: 'pagenumber',type:Number,required:false})


  @ApiResponse({
    status: HttpStatus.OK,
    type: [ReadDTO],
    description: 'Returns time-series of meter reads',
  })
  @UseGuards(AuthGuard('jwt'))
  public async newgetReads(
    @Param('externalId') meterId: string,
    @Query() filter: filterNoOffLimit,
    @Query('pagenumber')pagenumber:number|null,
    @Query('Month')month:number|null,
    @Query('Year')year:number|null,
    @UserDecorator() user: ILoggedInUser,
  )
  /*: Promise<ReadDTO[]>*/ {

    //finding the device details throught the device service
     filter.offset=0;
     filter.limit=5;
     let device: DeviceDTO | null;  
     
     if(month && !year)
   {
    throw new HttpException('Year is required when month is given',400)
    }
     if(user.role==='Buyer'){
       device = await this.deviceService.findOne(parseInt(meterId));
   
     }else{
      device = await this.deviceService.findDeviceByDeveloperExternalId(meterId, user.organizationId);
     }
      console.log("getmeterdevice");
     console.log(device);
     if (device === null) {

       return new Promise((resolve, reject) => {
         reject(
           new ConflictException({
             success: false,
             message: `Invalid device id`,
           })
         );
       });
     }
    


     if(filter.accumulationType)
     {
       return this.internalReadsService.getAccumulatedReads(device.externalId,user.organizationId,device.developerExternalId,filter.accumulationType,month,year);
     }

     else
     {
      return this.internalReadsService.getAllRead(device.externalId, filter, device.createdAt,pagenumber);
     }
  
   }
/* */


  // @Get('/:meter/difference')
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   type: [ReadDTO],
  //   description:
  //     'Returns time-series of difference between subsequent meter reads',
  // })
  // @)UseGuards(AuthGuard('jwt'))
  // public async getReadsDifference(
  //   @Param('meter') meterId: string,
  //   @Query() filter: FilterDTO,
  // ): Promise<ReadDTO[]> {
  //   let device: DeviceDTO | null = await this.deviceService.findReads(meterId);

  //   if (device === null) {

  //     return new Promise((resolve, reject) => {
  //       reject(
  //         new ConflictException({
  //           success: false,
  //           message: `Invalid device id`,
  //         })
  //       );
  //     });
  //   }
  //   return super.getReadsDifference(device.externalId, filter);
  // }

  // @Get('group/:groupId/aggregate')
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   type: [AggregatedReadDTO],
  //   description:
  //     'Returns aggregated time-series of difference between subsequent meter reads',
  // })
  // public async getGroupAggregatedReads(
  //   @Param('groupId') groupId: number,
  //   @Query() filter: AggregateFilterDTO,
  // ): Promise<AggregatedReadDTO[]> {
  //   return this.internalReadsService.getGroupAggregatedReads(groupId, filter);
  // }

  // @Get('/:meter/aggregate')
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   type: [AggregatedReadDTO],
  //   description:
  //     'Returns aggregated time-series of difference between subsequent meter reads',
  // })
  // public async getReadsAggregates(
  //   @Param('meter') meterId: string,
  //   @Query() filter: AggregateFilterDTO,
  // ): Promise<AggregatedReadDTO[]> {
  //   let device: DeviceDTO | null = await this.deviceService.findReads(meterId);

  //   if (device === null) {

  //     return new Promise((resolve, reject) => {
  //       reject(
  //         new ConflictException({
  //           success: false,
  //           message: `Invalid device id`,
  //         })
  //       );
  //     });
  //   }
  //   return super.getReadsAggregates(device.externalId, filter);
  // }

  // @Post('/:id')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(Role.Admin, Role.DeviceOwner, Role.OrganizationAdmin)
  // public async storeReads(
  //   @Param('id') id: string,
  //   @Body() measurements: MeasurementDTO,
  // ): Promise<void> {
  //   return await this.internalReadsService.storeRead(id, measurements);
  // }
  @Post('new/:id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New meter reads for historical data, Delta readings and Aggregate Readings',
    type: [NewIntmediateMeterReadDTO],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.DeviceOwner, Role.OrganizationAdmin)
  public async newstoreRead(
    @Param('id') id: string,
    @Body() measurements: NewIntmediateMeterReadDTO,
    @UserDecorator() user: ILoggedInUser,
  ): Promise<void> {
    if (id.trim() === "" && id.trim() === undefined) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `id should not be empty`,
          })
        );
      });
    }
    id = id.trim();
    let device: DeviceDTO | null = await this.deviceService.findDeviceByDeveloperExternalId(id, user.organizationId);
    //console.log(device);
    if (device === null) {

      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `Invalid device id`,
          })
        );
      });
    }

    if (measurements.timezone !== null && measurements.timezone !== undefined && measurements.timezone.toString().trim() !== '') {
      measurements.timezone = measurements.timezone.toString().trim();
      let allTimezoneNamesLowerCase: Array<string> = [];
      //momentTimeZone.tz.names().forEach(ele=>console.log(ele.toLowerCase()));
      momentTimeZone.tz.names().forEach(ele => allTimezoneNamesLowerCase.push(ele.toLowerCase()));
      //console.log(allTimezoneNamesLowerCase);
      if (!allTimezoneNamesLowerCase.includes(measurements.timezone.toLowerCase())) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `Invalid time zone: ${measurements.timezone}`,
            })
          );
        });
      }
      measurements.timezone = momentTimeZone.tz.names()[allTimezoneNamesLowerCase.findIndex(ele => ele === measurements.timezone.toLowerCase())];
      let dateInvalid: boolean = false;
      measurements.reads.forEach(ele => {
        for (let key in ele) {

          if (key === 'starttimestamp' || key === 'endtimestamp') {
            if (ele[key]) {
              const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.{0,1}\d{0,3}$/;
              //@ts-ignore
              if (ele[key].includes('.')) {
                //@ts-ignore
                if (Number.isNaN(parseFloat(ele[key].substring(ele[key].indexOf('.'), ele[key].length)))) {

                  throw new ConflictException({
                    success: false,
                    message: `Invalid date sent  ${ele[key]}` + ` please sent valid date, format for dates is YYYY-MM-DD hh:mm:ss example 2020-02-19 19:20:55 or to include milliseconds add dot and upto 3 digits after seconds example 2020-02-19 19:20:55.2 or 2020-02-19 19:20:54.333`,
                  })
                }
              }
              if (new Date(ele[key]).getTime() > new Date().getTime()) {

                const cur = new Date().toLocaleString('en-US', { timeZone: measurements.timezone })

                throw new ConflictException({
                  success: false,
                  message: `One or more measurements endtimestamp ${ele[key]} is greater than current date ${moment(cur).format('YYYY-MM-DD HH:mm:ss')}`,
                })


              }
              //@ts-ignore
              if (!dateTimeRegex.test(ele[key])) {
                dateInvalid = true;
                throw new ConflictException({
                  success: false,
                  message: `Invalid date sent  ${ele[key]}` + ` please sent valid date, format for dates is YYYY-MM-DD hh:mm:ss example 2020-02-19 19:20:55 or to include milliseconds add dot and upto 3 digits after seconds example 2020-02-19 19:20:55.2 or 2020-02-19 19:20:54.333`,
                })
              }
              else {

                let dateTime;
                dateTime = momentTimeZone.tz(ele[key], measurements.timezone);
                if (!dateTime.isValid()) {
                  dateInvalid = true;
                  throw new ConflictException({
                    success: false,
                    message: `Invalid date sent  ${ele[key]}`,
                  })
                }
                else {
                  let milliSeondsToAddSentInRequest: string = '';
                  //@ts-ignore
                  if (ele[key].includes('.') && parseInt(ele[key].substring(ele[key].indexOf('.'), ele[key].length)) != NaN) {

                    //@ts-ignore
                    milliSeondsToAddSentInRequest = ele[key].substring(ele[key].indexOf('.'), ele[key].length);
                  }
                  let utcString: string = dateTime.clone().utc().format();

                  if (milliSeondsToAddSentInRequest != '') {
                    utcString = utcString.substring(0, utcString.length - 1) + milliSeondsToAddSentInRequest + 'Z';
                  }
                  else {
                    utcString = utcString.substring(0, utcString.length - 1) + '.000Z';
                  }
                  //@ts-ignore
                  ele[key] = utcString;
                }

              }
            }
          }
        }
      });
      if (dateInvalid) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `Invalid date please sent valid date, format for dates is YYYY-MM-DD hh:mm:ss example 2020-02-19 19:20:55 or to include milliseconds add dot and upto 3 digits after seconds example 2020-02-19 19:20:55.2 or 2020-02-19 19:20:54.333`,
            })
          );
        });
      }

    }

    //check for according to read type if start time stamp and end time stamps are sent
    if (measurements.type === ReadType.History) {
      let datesContainingNullOrEmptyValues: boolean = false;
      measurements.reads.forEach(ele => {
        //@ts-ignore
        if (ele.starttimestamp === null || ele.starttimestamp === undefined || ele.starttimestamp === "" || ele.endtimestamp === null || ele.endtimestamp === undefined || ele.endtimestamp === "") {
          datesContainingNullOrEmptyValues = true;
        }
      });



      if (datesContainingNullOrEmptyValues) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: 'One ore more Start Date and End Date values are not sent for History, start and end date is required for History meter ready type',
            }),
          );
        });
      }
    }
    if (measurements.type === ReadType.Delta || measurements.type === ReadType.ReadMeter) {
      let datesContainingNullOrEmptyValues: boolean = false;
      measurements.reads.forEach(ele => {
        //@ts-ignore
        if (ele.endtimestamp === null || ele.endtimestamp === undefined || ele.endtimestamp === "") {
          datesContainingNullOrEmptyValues = true;
        }
      });
      if (datesContainingNullOrEmptyValues) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `One ore more End Date values are not sent for ${measurements.type},  end date is required`,
            }),
          );
        });
      }
    }
    // Date format vaildation
    if (measurements.type === ReadType.History) {

      let datevalid: boolean = true;

      measurements.reads.forEach(ele => {


        //@ts-ignore
        let startdateformate = isValidUTCDateFormat(ele.starttimestamp)
        //dateFormateToCheck.test(ele.starttimestamp);


        //@ts-ignore
        let enddateformate = isValidUTCDateFormat(ele.endtimestamp);

        if (!startdateformate || !enddateformate) {
          datevalid = false;
        }
        // moment().format('YYYY-MM-DDTHH:mm:ssZ');

        // const dateFormat = 'YYYY-MM-DDTHH:mm:ssZ';
        // const fromDateFormat = moment(ele.starttimestamp).format(dateFormat);
        // const toDateFormat = moment(new Date(ele.endtimestamp)).format(dateFormat);

        // var reqstartDate = moment(fromDateFormat, dateFormat, true).isValid();


        // var reqendtDate = moment(toDateFormat, dateFormat, true).isValid();

        // if (!reqstartDate || !reqendtDate) {
        //   datevalid2 = false;
        // }

      })

      if (!datevalid) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: ' Invalid Start Date and/or End Date, valid format is  YYYY-MM-DDThh:mm:ss.millisecondsZ example 2022-10-18T11:35:27.640Z ',
            }),
          );
        });
      }
    }
    if (measurements.type === ReadType.Delta || measurements.type === ReadType.ReadMeter) {
      let datevalid1: boolean = true;

      measurements.reads.forEach(ele => {

        //@ts-ignore
        let enddateformate = isValidUTCDateFormat(ele.endtimestamp);

        if (!enddateformate) {
          datevalid1 = false;
        }


      })

      if (!datevalid1) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: ' Invalid  End Date, valid format is  YYYY-MM-DDThh:mm:ss.millisecondsZ example 2022-10-18T11:35:27.640Z ',
            }),
          );
        });
      }

    }
    // Device onboarding and system date validation
    if (measurements.type === ReadType.Delta || measurements.type === ReadType.ReadMeter) {
      let allDatesAreAfterCreatedAt: boolean = true;
      let allDatesAreAftercommissioningDate: boolean = true;
      measurements.reads.forEach(ele => {
        if (device && device.createdAt) {
          if (new Date(ele.endtimestamp).getTime() <= new Date(device.createdAt).getTime()) {
            allDatesAreAfterCreatedAt = false;
          }
        }
        if (device && device.commissioningDate) {
          if (new Date(ele.endtimestamp).getTime() <= new Date(device.commissioningDate).getTime()) {
            allDatesAreAftercommissioningDate = false;
          }
        }
      })
      if (!allDatesAreAfterCreatedAt) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `One or more measurements endtimestamp is less than or equal to device onboarding date${device?.createdAt}`,
            })
          );
        });
      }
      if (!allDatesAreAftercommissioningDate) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `One or more measurements endtimestamp should be greater than to device commissioningDate date${device?.commissioningDate}`,
            })
          );
        });
      }
    }
    if (measurements.type === ReadType.Delta || measurements.type === ReadType.ReadMeter) {
      let allEndDatesAreBeforSystemDate: boolean = true;
      measurements.reads.forEach(ele => {
        if (device && device.createdAt) {

          if (new Date(ele.endtimestamp).getTime() > new Date().getTime()) {
            allEndDatesAreBeforSystemDate = false;
          }
        }
      })
      if (!allEndDatesAreBeforSystemDate) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `One or more measurements endtimestamp is greater than current date`,
            })
          );
        });
      }
    }

    if (measurements.type === ReadType.History) {
      let allDatesAreBeforeCreatedAt: boolean = true;
      let allStartDatesAreBeforeEnddate: boolean = true;
      let readvalue: boolean = true;
      let historyallDatesAreAftercommissioningDate: boolean = true;
      measurements.reads.forEach(ele => {
        if (device && device.createdAt) {
          if (new Date(ele.endtimestamp).getTime() > new Date(device.createdAt).getTime()) {
            allDatesAreBeforeCreatedAt = false;
          }
          if (new Date(ele.starttimestamp).getTime() > new Date(device.createdAt).getTime()) {
            allDatesAreBeforeCreatedAt = false;
          }
          if (new Date(ele.starttimestamp).getTime() > new Date(ele.endtimestamp).getTime()) {
            allStartDatesAreBeforeEnddate = false;
          }
        }

        if (ele.value < 0) {
          readvalue = false;
        }
        if (device && device.commissioningDate) {
          if (new Date(ele.starttimestamp).getTime() <= new Date(device.commissioningDate).getTime()) {
            historyallDatesAreAftercommissioningDate = false;
          }
          if (new Date(ele.endtimestamp).getTime() <= new Date(device.commissioningDate).getTime()) {
            historyallDatesAreAftercommissioningDate = false;
          }
        }
      })
      if (!allStartDatesAreBeforeEnddate) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `starttimestamp should be prior to endtimestamp. One or more measurements starttimestamp is greater than endtimestamp `,
            })
          );
        });
      }
      if (!allDatesAreBeforeCreatedAt) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `For History reading starttimestamp and endtimestamp should be prior to device onboarding date. One or more measurements endtimestamp and or starttimestamp is greater than device onboarding date${device?.createdAt}`,
            })
          );
        });
      }

      if (!readvalue) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `meter read value should be greater then 0 `,
            })
          );
        });
      }
      if (!historyallDatesAreAftercommissioningDate) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `One or more measurements starttimestamp and endtimestamp should be greater than to device commissioningDate date ${device?.commissioningDate}`,
            })
          );
        });
      }
    }
    // negative value validation
    if (measurements.type === ReadType.History || measurements.type === ReadType.Delta) {

      let readvalue: boolean = true;
      measurements.reads.forEach(ele => {
        if (ele.value <= 0) {
          readvalue = false;
        }
      })
      if (!readvalue) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: `meter read value should be greater then 0 `,
            })
          );
        });
      }
    }
    // device organization and user organization validation
    if (device && device.organizationId !== user.organizationId) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `Device doesnt belongs to the requested users organization`,
          })
        );
      });
    }

    if (measurements.reads.length > 1) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `can not allow multiple reads simultaneously `,
          })
        );
      });
    }
    return await this.internalReadsService.newstoreRead(device.externalId, measurements);
  }
  @Get('/latestread/:externalId')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the latest meter read of the given device',
  })
  @UseGuards(AuthGuard('jwt'))
  public async getLatestMeterRead(
    @Param("externalId") externalId: string,
    @UserDecorator() user: ILoggedInUser,
  ) {

    let device: DeviceDTO | null
    if (user.role === 'Buyer') {
      device = await this.deviceService.findOne(parseInt(externalId));

    } else {
      device = await this.deviceService.findDeviceByDeveloperExternalId(externalId, user.organizationId);

    }

    if (device === null) {

      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `Invalid device id`,
          })
        );
      });
    }

    let deviceExternalId;
    let latestReadObject;
    let latestRead;

    deviceExternalId = device.externalId;
    console.log("externalId::" + deviceExternalId);

    if (!device.meterReadtype) {
      throw new HttpException('Read not found', 400)
    }
    else {

      latestReadObject = await this.internalReadsService.latestread(deviceExternalId, device.createdAt);

      console.log(latestReadObject)

      if (typeof latestReadObject === 'undefined' || latestReadObject.length == 0) {
        throw new HttpException('Read Not found', 400)
      }
      if (user.role === 'Buyer') {
        return {
          externalId: device.developerExternalId,
          timestamp: latestReadObject[0].timestamp,
          value: latestReadObject[0].value
        }
      }

      return {
        "enddate": latestReadObject[0].timestamp,
        "value": latestReadObject[0].value
      }
    }
  }

}
