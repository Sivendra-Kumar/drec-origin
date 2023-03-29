import {
  Controller,
  Get,
  Post,
  Patch,
  HttpStatus,
  Param,
  Body,
  UseGuards,
  Delete,
  Query,
  ValidationPipe,
  ConflictException
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import {
  validate,
  validateOrReject,
  Contains,
  IsInt,
  Length,
  IsEmail,
  IsFQDN,
  IsDate,
  Min,
  Max,
} from 'class-validator';


import { DeviceGroupService } from './device-group.service';
import {
  AddGroupDTO,
  DeviceGroupDTO,
  DeviceIdsDTO,
  SelectableDeviceGroupDTO,
  UnreservedDeviceGroupsFilterDTO,
  UpdateDeviceGroupDTO,
  ReserveGroupsDTO,
  CSVBulkUploadDTO,
  JobFailedRowsDTO,
  EndReservationdateDTO,
  NewUpdateDeviceGroupDTO,
  ResponseDeviceGroupDTO
} from './dto';
import { Roles } from '../user/decorators/roles.decorator';
import { Installation, OffTaker, Role, Sector, StandardCompliance } from '../../utils/enums';
import { isValidUTCDateFormat } from '../../utils/checkForISOStringFormat';
import { RolesGuard } from '../../guards/RolesGuard';
import { UserDecorator } from '../user/decorators/user.decorator';
import { DeviceDescription, ILoggedInUser } from '../../models';
import { NewDeviceDTO } from '../device/dto';
import { File, FileService } from '../file';

import { parse } from 'csv-parse';
import * as fs from 'fs';
import { Readable } from 'stream';

import csv from 'csv-parser';
import { DeviceCsvFileProcessingJobsEntity, StatusCSV } from './device_csv_processing_jobs.entity';
import { Permission } from '../permission/decorators/permission.decorator';
import { ACLModules } from '../access-control-layer-module-service/decorator/aclModule.decorator';
import { PermissionGuard } from '../../guards';
import { DeviceGroupNextIssueCertificate } from './device_group_issuecertificate.entity';
import { CheckCertificateIssueDateLogForDeviceGroupEntity } from './check_certificate_issue_date_log_for_device_group.entity'
import { OrganizationService } from '../organization/organization.service';

@ApiTags('device-group')
@ApiBearerAuth('access-token')
@ApiSecurity('drec')
@Controller('/device-group')
export class DeviceGroupController {
  csvParser = csv({ separator: ',' });

  parser = parse({
    delimiter: ','
  });
  constructor(private readonly deviceGroupService: DeviceGroupService, private readonly fileService: FileService, private organizationService: OrganizationService) { }

  @Get()
  @ApiOkResponse({
    type: [DeviceGroupDTO],
    description: 'Returns all Device groups',
  })
  async getAll(): Promise<DeviceGroupDTO[]> {
    // return new Promise((resolve,reject)=>{
    //   resolve([]);
    // });
    /* for now commenting because ui is giving error because it has removed fields sectors standard complaince of devices */
    return this.deviceGroupService.getAll();
  }

  @Get('/unreserved')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Buyer)
  @ApiOkResponse({
    type: [SelectableDeviceGroupDTO],
    description: 'Returns all unreserved Device Groups',
  })
  async getUnreserved(
    @Query(ValidationPipe) filterDto: UnreservedDeviceGroupsFilterDTO,
  ): Promise<SelectableDeviceGroupDTO[]> {
    return this.deviceGroupService.getReservedOrUnreserved(filterDto);
  }

  @Get('/reserved')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.Buyer)
  @ApiOkResponse({
    type: [SelectableDeviceGroupDTO],
    description: 'Returns all reserved Device Groups',
  })
  async getReserved(
    @UserDecorator() { id }: ILoggedInUser,
    @Query(ValidationPipe) filterDto: UnreservedDeviceGroupsFilterDTO,
  ): Promise<SelectableDeviceGroupDTO[]> {
    return this.deviceGroupService.getReservedOrUnreserved(filterDto, id);
  }

  @Get('/my')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OrganizationAdmin, Role.DeviceOwner, Role.Buyer)
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceGroupDTO],
    description: 'Returns my Device groups',
  })
  async getMyDevices(
    @UserDecorator() { id, organizationId, role }: ILoggedInUser,
  ): Promise<DeviceGroupDTO[]> {
    switch (role) {
      case Role.DeviceOwner:
        return await this.deviceGroupService.getOrganizationDeviceGroups(
          organizationId,
        );
      case Role.Buyer:
        return await this.deviceGroupService.getBuyerDeviceGroups(id);
      case Role.OrganizationAdmin:
        return await this.deviceGroupService.getAll();
      default:
        return await this.deviceGroupService.getOrganizationDeviceGroups(
          organizationId,
        );
    }
  }

  @Get('/:id')
  @ApiOkResponse({
    type: DeviceGroupDTO,
    description: 'Returns a Device group',
  })
  @ApiNotFoundResponse({ description: `No device group found` })
  async get(@Param('id') id: number): Promise<DeviceGroupDTO | null> {
    return this.deviceGroupService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))//, RolesGuard)
  // @Roles(Role.DeviceOwner, Role.Admin,Role.Buyer)
  @ApiResponse({
    status: HttpStatus.OK,
    type: DeviceGroupDTO,
    description: 'Returns a new created Device group',
  })
  public async createOne(
    @UserDecorator() { organizationId }: ILoggedInUser,
    @UserDecorator() user: ILoggedInUser,
    @Body() deviceGroupToRegister: AddGroupDTO,
  ): Promise<ResponseDeviceGroupDTO | null> {

    //integer range which is for deviceId in device(id) table
    //-2147483648 to +2147483647
    //https://www.postgresql.org/docs/9.1/datatype-numeric.html

    if (!Array.isArray(deviceGroupToRegister.deviceIds) || deviceGroupToRegister.deviceIds.filter(ele => ele >= -2147483648 && ele <= 2147483647).length !== deviceGroupToRegister.deviceIds.length) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: 'One or more device ids are invalid',
          }),
        );
      });
    }
    if (deviceGroupToRegister.deviceIds.length == 0) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: 'Please provide devices for reservation, deviceIds is empty atleast one device is required',
          }),
        );
      });
    }

    if (isNaN(deviceGroupToRegister.targetCapacityInMegaWattHour) || deviceGroupToRegister.targetCapacityInMegaWattHour <= 0 || deviceGroupToRegister.targetCapacityInMegaWattHour == -0) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: 'targetCapacityInMegaWattHour should be valid number can include decimal but should be greater than 0',
          }),
        );
      });
    }

    if (typeof deviceGroupToRegister.reservationStartDate === "string") {
      if (!isValidUTCDateFormat(deviceGroupToRegister.reservationStartDate)) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: ' Invalid reservationStartDate, valid format is  YYYY-MM-DDThh:mm:ss.millisecondsZ example 2022-10-18T11:35:27.640Z ',
            }),
          );
        });
      }
      deviceGroupToRegister.reservationStartDate = new Date(deviceGroupToRegister.reservationStartDate);
    }
    if (typeof deviceGroupToRegister.reservationEndDate === "string") {
      if (!isValidUTCDateFormat(deviceGroupToRegister.reservationEndDate)) {
        return new Promise((resolve, reject) => {
          reject(
            new ConflictException({
              success: false,
              message: ' Invalid reservationEndDate, valid format is  YYYY-MM-DDThh:mm:ss.millisecondsZ example 2022-10-18T11:35:27.640Z ',
            }),
          );
        });
      }
      deviceGroupToRegister.reservationEndDate = new Date(deviceGroupToRegister.reservationEndDate);
    }
    console.log("188");
    if (deviceGroupToRegister.reservationStartDate && deviceGroupToRegister.reservationEndDate && deviceGroupToRegister.reservationStartDate.getTime() >= deviceGroupToRegister.reservationEndDate.getTime()) {
      throw new ConflictException({
        success: false,
        message: 'start date cannot be less than or same as end date',
      });
    }
    let maximumBackDateForReservation: Date = new Date(new Date().getTime() - (3.164e+10*3));
    if (deviceGroupToRegister.reservationStartDate.getTime() <= maximumBackDateForReservation.getTime() || deviceGroupToRegister.reservationEndDate.getTime() <= maximumBackDateForReservation.getTime()) {
      console.log("198");
      throw new ConflictException({
        success: false,
        message: 'start date or end date cannot be less than 3 year from current date',
      });
    }
    if (organizationId === null || organizationId === undefined) {
      console.log("206");
      throw new ConflictException({
        success: false,
        message: 'User does not has organization associated',
      });
    }
   
    console.log(deviceGroupToRegister.blockchainAddress);
    
    if (deviceGroupToRegister.blockchainAddress !== null && deviceGroupToRegister.blockchainAddress !== undefined &&deviceGroupToRegister.blockchainAddress.trim()!=="" ) {
      console.log("deviceGroupToRegister.blockchainAddress");
      deviceGroupToRegister.blockchainAddress = deviceGroupToRegister.blockchainAddress.trim();
     
      return await this.deviceGroupService.createOne(
        organizationId,
        deviceGroupToRegister,
        user.id,
        deviceGroupToRegister.blockchainAddress
      );

    } else {
      console.log(user.blockchainAccountAddress);
      if (user.blockchainAccountAddress !== null && user.blockchainAccountAddress !== undefined) {
        console.log("user.blockchainAddress")
        return await this.deviceGroupService.createOne(
          organizationId,
          deviceGroupToRegister,
          user.id,
          user.blockchainAccountAddress
        );

      } else {

        throw new ConflictException({
          success: false,
          message: 'No blockchain address sent and no blockchain address attached to this account',
        });
      }
    }

  }



  @Post('multiple')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DeviceOwner, Role.Admin)
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceGroupDTO],
    description: 'Returns a new created Device group',
  })
  @ApiBody({ type: [AddGroupDTO] })
  public async createMultiple(
    @UserDecorator() { organizationId }: ILoggedInUser,
    @Body() deviceGroupsToRegister: AddGroupDTO[],
  ): Promise<DeviceGroupDTO[]> {
    return await this.deviceGroupService.createMultiple(
      organizationId,
      deviceGroupsToRegister,
    );
  }

  @Post('bulk-devices')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin, Role.DeviceOwner, Role.OrganizationAdmin)
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceGroupDTO],
    description: 'Returns auto-created device groups',
  })
  @ApiBody({ type: [NewDeviceDTO] })
  public async createBulk(
    @UserDecorator() { organizationId }: ILoggedInUser,
    @Body() devicesToRegister: NewDeviceDTO[],
  ): Promise<DeviceGroupDTO[]> {
    return await this.deviceGroupService.registerBulkDevices(
      organizationId,
      devicesToRegister,
    );
  }




  @Post('process-creation-bulk-devices-csv')
  @UseGuards(AuthGuard('jwt'))
  //@UseGuards(AuthGuard('jwt'), PermissionGuard)
  //@Permission('Write')
  //@ACLModules('DEVICE_BULK_MANAGEMENT_CRUDL')
  //@Roles(Role.Admin, Role.DeviceOwner,Role.OrganizationAdmin)
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceCsvFileProcessingJobsEntity],
    description: 'Returns created devices from csv',
  })
  @ApiBody({ type: CSVBulkUploadDTO })
  public async processCreationBulkFromCSV
    (@UserDecorator() user: ILoggedInUser,
      @UserDecorator() { organizationId }: ILoggedInUser,
      @Body() fileToProcess: CSVBulkUploadDTO): Promise<DeviceCsvFileProcessingJobsEntity> {
    if (user.organizationId === null || user.organizationId === undefined) {
      throw new ConflictException({
        success: false,
        message:
          'User needs to have organization added'
      })
    }
    console.log(fileToProcess.fileName);
    let response:any = await this.fileService.GetuploadS3(fileToProcess.fileName);
    console.log(response.filename);
    if (response == undefined) {
      //throw new Error("file not found");
      throw new ConflictException({
        success: false,
        message:
          'File Not Found'
      })

    }
    if (!response.filename.endsWith('.csv')) {
      //throw new Error("file not found");
      throw new ConflictException({
        success: false,
        message:
          'Invalid file'
      })

    }
    let jobCreated = await this.deviceGroupService.createCSVJobForFile(user.id, organizationId, StatusCSV.Added,  response.filename);

    return jobCreated;
  }
  @Post('/reserve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Buyer)
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceGroupDTO],
    description: 'Returns a new created Device group',
  })
  public async reserve(
    @UserDecorator()
    { id, blockchainAccountAddress }: ILoggedInUser,
    @Body() ids: ReserveGroupsDTO,
  ): Promise<DeviceGroupDTO[]> {
    return await this.deviceGroupService.reserveGroup(
      ids,
      id,
      blockchainAccountAddress,
    );
  }

  @Post('/unreserve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Buyer)
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceGroupDTO],
    description: 'Unreserves device groups from buyer',
  })
  public async unreserve(
    @UserDecorator()
    { id }: ILoggedInUser,
    @Body() ids: ReserveGroupsDTO,
  ): Promise<DeviceGroupDTO[]> {
    return await this.deviceGroupService.unreserveGroup(ids, id);
  }
  @Post('/add/:id')
  @UseGuards(AuthGuard('jwt'))
  //@Roles(Role.Admin)
  @ApiResponse({
    status: HttpStatus.OK,
    type: DeviceGroupDTO,
    description: 'Returns a new created Device group',
  })
  public async addDevices(
    @Param('id') id: number,
    @UserDecorator() { organizationId }: ILoggedInUser,
    @Body() deviceIds: DeviceIdsDTO,
  ): Promise<DeviceGroupDTO | void> {
    return await this.deviceGroupService.addDevices(
      id,
      organizationId,
      deviceIds,
    );
  }

  @Post('/remove/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.Admin)
  @ApiResponse({
    status: HttpStatus.OK,
    type: DeviceGroupDTO,
    description: 'Returns a new created Device group',
  })
  public async removeDevices(
    @Param('id') id: number,
    @UserDecorator() { organizationId }: ILoggedInUser,
    @Body() deviceIds: DeviceIdsDTO,
  ): Promise<DeviceGroupDTO | void> {
    return await this.deviceGroupService.removeDevices(
      id,
      organizationId,
      deviceIds,
    );
  }

  @Patch('/:id')
  @UseGuards(AuthGuard('jwt'))
  // @Roles(Role.DeviceOwner, Role.Admin)
  @ApiResponse({
    status: HttpStatus.OK,
    type: NewUpdateDeviceGroupDTO,
    description: 'Returns an updated Device Group',
  })
  @ApiNotFoundResponse({ description: `No device group found` })
  public async update(
    @Param('id') id: number,
    @UserDecorator() loggedUser: ILoggedInUser,
    @Body() groupToUpdate: NewUpdateDeviceGroupDTO,
  ): Promise<DeviceGroupDTO> {

    let devicenextissuence: DeviceGroupNextIssueCertificate | null = await this.deviceGroupService.getGroupiCertificateIssueDate({ groupId: id });
    if (devicenextissuence === null) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `This device groups reservation has already ended `,
          })
        );
      });
    }
    if (new Date(groupToUpdate.reservationEndDate).getTime() < new Date(devicenextissuence.start_date).getTime()) {
      return new Promise((resolve, reject) => {
        reject(
          new ConflictException({
            success: false,
            message: `Certificates are already generated or in progress for device group, cannot reduce below start time:${devicenextissuence.start_date}`,
          })
        );
      });
    }

    return await this.deviceGroupService.update(
      id,
      loggedUser,
      groupToUpdate,
    );
  }

  @Delete('/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DeviceOwner, Role.Admin)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Remove device group',
  })
  @ApiNotFoundResponse({ description: `No device group found` })
  public async remove(
    @Param('id') id: number,
    @UserDecorator() { organizationId }: ILoggedInUser,
  ): Promise<void> {
    return await this.deviceGroupService.remove(id, organizationId);
  }

  @Get('/bulk-upload-status/:id')
  @UseGuards(AuthGuard('jwt'))//, PermissionGuard)
  // @Permission('Read')
  // @ACLModules('DEVICE_BULK_MANAGEMENT_CRUDL')
  @ApiResponse({
    status: HttpStatus.OK,
    type: JobFailedRowsDTO,
    description: 'Returns status of job id for bulk upload',
  })
  public async getBulkUploadJobStatus(
    @Param('id') jobId: number,
    @UserDecorator() { organizationId }: ILoggedInUser
  ): Promise<JobFailedRowsDTO | undefined> {
    console.log("jobId", jobId);

    let data = await this.deviceGroupService.getFailedRowDetailsForCSVJob(
      jobId
    );
    console.log("data", data);
    return await this.deviceGroupService.getFailedRowDetailsForCSVJob(
      jobId
    );
  }

  @Get('/bulk-upload/get-all-csv-jobs-of-organization')
  @UseGuards(AuthGuard('jwt'))
  //@UseGuards(AuthGuard('jwt'),PermissionGuard)
  //@Permission('Read')
  //@ACLModules('DEVICE_BULK_MANAGEMENT_CRUDL')
  @ApiResponse({
    status: HttpStatus.OK,
    type: [DeviceCsvFileProcessingJobsEntity],
    description: 'Returns created jobs of an organization',
  })
  public async getAllCsvJobsBelongingToOrganization(@UserDecorator() user: ILoggedInUser, @UserDecorator() { organizationId }: ILoggedInUser): Promise<Array<DeviceCsvFileProcessingJobsEntity>> {
    console.log("user", user);
    console.log("organization", organizationId);

    if (user.organizationId === null || user.organizationId === undefined) {
      throw new ConflictException({
        success: false,
        message:
          'User needs to have organization added'
      })
    }
    return this.deviceGroupService.getAllCSVJobsForOrganization(organizationId);
  }

  @Get('certificatelog/:id')
  @ApiOkResponse({
    type: DeviceGroupDTO,
    description: 'Returns a Device group',
  })
  @ApiNotFoundResponse({ description: `No device group found` })
  async getdevciegrouplog(@Param('id') id: number): Promise<CheckCertificateIssueDateLogForDeviceGroupEntity[] | null> {
    return this.deviceGroupService.getDeviceGrouplog(id);
  }
  //   @Post('/buyer-reservation')
  //   @UseGuards(AuthGuard('jwt'),PermissionGuard)
  //   @Permission('Write')
  //   @ACLModules('DEVICE_BUYER_RESERVATION_MANAGEMENT_CRUDL')
  //   @ApiResponse({
  //    status: HttpStatus.OK,
  //    type: JobFailedRowsDTO,
  //    description: 'Returns status of job id for bulk upload',
  //  })
  //  public async createBuyerReservationGroups(
  //    @UserDecorator() { organizationId }: ILoggedInUser
  //  ): Promise<JobFailedRowsDTO | undefined> {

  //  }
  @Delete('endreservation/:id')
  @UseGuards(AuthGuard('jwt'))

  @ApiResponse({
    status: HttpStatus.OK,
    type: EndReservationdateDTO,
    description: 'Reservation End',
  })
  @ApiNotFoundResponse({ description: `No  Reservation found` })
  public async endresavation(
    @Param('id') id: number,
    @Body() endresavationdate: EndReservationdateDTO,
    @UserDecorator() { organizationId }: ILoggedInUser,
  ): Promise<void> {
    return await this.deviceGroupService.EndReservationGroup(id, organizationId, endresavationdate);
  }
}
