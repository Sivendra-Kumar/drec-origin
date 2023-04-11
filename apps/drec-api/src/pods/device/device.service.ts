import {
  Injectable,
  NotFoundException,
  NotAcceptableException,
  Logger,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository, In, IsNull, Not, Brackets, SelectQueryBuilder, FindConditions, FindManyOptions, Between, LessThanOrEqual, MoreThanOrEqual, getConnection } from 'typeorm';
import { Device } from './device.entity';
import { NewDeviceDTO } from './dto/new-device.dto';
import { defaults, isBoolean } from 'lodash';
import {
  DeviceDTO,
  FilterDTO,
  GroupedDevicesDTO,
  UngroupedDeviceDTO,
  UpdateDeviceDTO,
  BuyerDeviceFilterDTO,
} from './dto';
import { DeviceStatus } from '@energyweb/origin-backend-core';
import { DeviceOrderBy, Integrator, OffTaker, ReadType, Role } from '../../utils/enums';
import cleanDeep from 'clean-deep';
import {
  DeviceKey,
  DeviceSortPropertyMapper,
  IREC_DEVICE_TYPES,
  IREC_FUEL_TYPES,
} from '../../models';
import { CodeNameDTO } from './dto/code-name.dto';
import { DeviceGroupByDTO } from './dto/device-group-by.dto';
import { groupByProps } from '../../utils/group-by-properties';
import { getCapacityRange } from '../../utils/get-capacity-range';
import { getDateRangeFromYear } from '../../utils/get-commissioning-date-range';
import { getCodeFromCountry } from '../../utils/getCodeFromCountry';
import { getFuelNameFromCode } from '../../utils/getFuelNameFromCode';
import { getDeviceTypeFromCode } from '../../utils/getDeviceTypeFromCode';
import { CheckCertificateIssueDateLogForDeviceEntity } from './check_certificate_issue_date_log_for_device.entity';
import { SingleDeviceIssuanceStatus } from '../../utils/enums'
import { DateTime } from 'luxon';
import { InfluxDB, FluxTableMetaData } from '@influxdata/influxdb-client';
import { SDGBenefits } from '../../models/Sdgbenefit'
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuid } from 'uuid';
import { OrgFilterDTO } from './dto/org-filter.dto';
import { countrCodesList } from 'src/models/country-code';
import { isValidUTCDateFormat } from 'src/utils/checkForISOStringFormat';
import { IsNumber } from 'class-validator';
import { HistoryIntermediate_MeterRead } from '../reads/history_intermideate_meterread.entity';
@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectRepository(HistoryIntermediate_MeterRead) private readonly historyrepository: Repository<HistoryIntermediate_MeterRead>,
    @InjectRepository(Device) private readonly repository: Repository<Device>,
    @InjectRepository(CheckCertificateIssueDateLogForDeviceEntity)
    private readonly checkdevcielogcertificaterepository: Repository<CheckCertificateIssueDateLogForDeviceEntity>,

  ) { }

  public async find(filterDto: FilterDTO): Promise<Device[]> {
    const query = this.getFilteredQuery(filterDto);
    return this.repository.find(query);
  }

  public async findForIntegrator(integrator: Integrator): Promise<Device[]> {
    return this.repository.find({
      where: {
        integrator,
      },
    });
  }

  async getOrganizationDevices(organizationId: number, filterDto: OrgFilterDTO, pagenumber: number) {
    if (pagenumber <= 0) {
      throw new HttpException("Zero or negative pagenumber given. Give a valid pagenumber", 400);
    }
    const pageSize = 10;
    const orgquery = await this.getOrgFilteredQuery(filterDto, organizationId, pagenumber, pageSize);
    const totaldevices = await this.repository.count(orgquery.query);
    const maxpagenumber = Math.ceil(totaldevices / pageSize);

    if (totaldevices == 0) {
      return { "devices": [], "totalNumberOfDevices": 0, "currentPageNumber": 0, "maxPageNumber": 0, "invalidFilters": [filterDto] };

    }
    if (pagenumber > maxpagenumber) {
      throw new HttpException("Given pagenumber is exceeding the maximum pagenumber.Please give a valid pagenumber", 400);
    }

    console.log(organizationId);
    const devices = await this.repository.find(orgquery.query);
    const newDevices = [];
    await devices.map((device: Device) => {
      device.externalId = device.developerExternalId
      delete device["developerExternalId"];
      newDevices.push(device);
    })

    return { "devices": newDevices, "totalNumberOfDevices": totaldevices, "currentPageNumber": pagenumber, "maxPageNumber": maxpagenumber, "invalidFilters": orgquery['invalidFilters'] };
  }

  private getOrgFilteredQuery(filter: OrgFilterDTO, organizationId: number, pageNumber: number, pageSize: number) {
    const skip = (pageNumber - 1) * pageSize;
    let fuelCodeQuery;
    let deviceCodeQuery;
    let offTakerQuery;
    let countries;
    let countriesQuery;
    let invalidFilters = [];
    let listofcountries = countrCodesList;

    let startDate;
    let endDate;
    let startDateString;
    let endDateString;

    if (filter.fuelCode) {
      fuelCodeQuery = filter.fuelCode.length > 0 ? In(Object.values(filter.fuelCode)) : undefined;
      if (typeof filter.fuelCode === 'string') {
        fuelCodeQuery = filter.fuelCode;
      }
    }


    if (filter.deviceTypeCode) {
      deviceCodeQuery = filter.deviceTypeCode.length > 0 ? In(Object.values(filter.deviceTypeCode)) : undefined;
      if (typeof filter.deviceTypeCode === 'string') {
        deviceCodeQuery = filter.deviceTypeCode;
      }
    }



    if (filter.offTaker) {
      offTakerQuery = filter.offTaker.length > 0 ? In(Object.values(filter.offTaker)) : undefined;
      if (typeof filter.offTaker === 'string') {
        offTakerQuery = filter.offTaker;
      }
    }

    //lables validations
    if (filter.labels) {
      if (!(typeof filter.labels === 'string')) {
        invalidFilters.push({ "Filter lables": filter.labels });
      }
    }
    //capacity validations

    if (filter.fromCapacity) {
      if (isNaN(filter.fromCapacity) || filter.fromCapacity <= 0) {
        invalidFilters.push({ "From capacity": filter.fromCapacity });
        filter.fromCapacity == undefined;
      }
    }

    if (filter.toCapacity) {
      if (isNaN(filter.toCapacity) || filter.toCapacity <= 0) {
        invalidFilters.push({ "To capacity": filter.toCapacity });
        filter.toCapacity == undefined;
      }
    }

    if (filter.fromCapacity && filter.toCapacity) {
      if (filter.fromCapacity >= filter.toCapacity) {
        invalidFilters.push({ "from capacity": filter.fromCapacity, "to capacity": filter.toCapacity });
        filter.fromCapacity = undefined;
        filter.toCapacity = undefined;
      }
    }

    //grid inter-connection validations

    if (filter.gridInterconnection) {
      if (!isBoolean(Boolean(filter.gridInterconnection))) {
        invalidFilters.push({ "invalid gridinterconnection": filter.gridInterconnection });
        filter.gridInterconnection = undefined;
      }
    }


    //country code validations

    if (filter.country) {
      filter.country = filter.country.toUpperCase();
      if (filter.country.includes(",")) {
        countries = filter.country.split(",");
      } else {
        countries = [filter.country];
      }
    }

    if (filter.country && typeof filter.country === 'string') {
      for (let i = 0; i < countries.length; i++) {
        if (!(listofcountries.find(ele => ele.countryCode === countries[i]))) {
          console.log("INVALID COUNTRY CODE: " + countries[i]);
          invalidFilters.push({ "Invalid country code": countries[i] });
        }
      }
    }


    if (filter.country) {
      if (typeof filter.country === 'string' && countries.length === 1) { // added check for single country
        countriesQuery = filter.country;
      } else if (countries.length > 1) { // changed condition
        countriesQuery = In(countries);
      } else {
        console.log("Invalid country filter"); // throw an error when no valid filter is found
      }
      console.log("Countries query: " + countriesQuery);
    }


    //comissioning date validations


    if (filter.startDate) {
      startDate = new Date(filter.startDate);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
      }
      startDateString = startDate.toISOString();
      console.log(`Start date: ${startDateString}`);
    }

    if (filter.endDate) {
      endDate = new Date(filter.endDate);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
      endDateString = endDate.toISOString();
      console.log(`End date: ${endDateString}`);
    }

    if (filter.startDate && filter.endDate) {
      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
    }

    const where = cleanDeep({
      fuelCode: fuelCodeQuery,
      deviceTypeCode: deviceCodeQuery,
      gridInterconnection: filter.gridInterconnection,
      offTaker: offTakerQuery,
      countryCode: countriesQuery,
      commissioningDate:
        (filter.startDate && filter.endDate)
          ? Between(startDateString, endDateString)
          : (filter.startDate && !filter.endDate)
            ? MoreThanOrEqual(startDateString)
            : (filter.endDate && !filter.startDate)
              ? LessThanOrEqual(endDateString)
              : undefined,
      labels: filter.labels,
      organizationId: organizationId,
      capacity:
        (filter.fromCapacity && filter.toCapacity && filter.fromCapacity > 0 && filter.toCapacity > 0 && filter.toCapacity >= filter.fromCapacity)
          ? Between(filter.fromCapacity, filter.toCapacity)
          : (filter.fromCapacity && filter.fromCapacity > 0 && !filter.toCapacity)
            ? MoreThanOrEqual(filter.fromCapacity)
            : (filter.toCapacity && filter.toCapacity > 0 && !filter.fromCapacity)
              ? LessThanOrEqual(filter.toCapacity)
              : undefined,
    });




    const query: FindManyOptions<Device> = {
      where,
      skip,
      take: pageSize,
    };

    return { "query": query, "invalidFilters": invalidFilters };

  }


  public async findForDevicesWithDeviceIdAndOrganizationId(
    deviceIds: Array<number>,
    organizationId: number,
  ): Promise<Device[]> {
    return this.repository.find({
      where: { id: In(deviceIds), organizationId },
    });
  }

  public async findForGroup(groupId: number): Promise<Device[]> {
    return this.repository.find({
      where: { groupId },
      order: {
        createdAt: 'DESC',
      },

    });
  }
  public async NewfindForGroup(groupId: number, endDate: string): Promise<{ [key: string]: Device[] }> {

    let groupdevice: Array<any> = await this.repository.find({
      where: { groupId },
      order: {
        createdAt: 'DESC',
      },
    });
    //console.log(groupdevice)

    groupdevice = groupdevice.filter(ele => ele.meterReadtype == ReadType.Delta || ele.meterReadtype == ReadType.ReadMeter)

    const deviceGroupedByCountry = this.groupBy(groupdevice, 'country');
    //console.log(deviceGroupedByCountry);
    return deviceGroupedByCountry;
  }

  private groupBy(array: any, key: any): Promise<{ [key: string]: Device[] }> {
    console.log(array)

    return array.reduce((result: any, currentValue: any) => {

      (result[currentValue[key]] = result[currentValue[key]] || []).push(
        currentValue
      );

      return result;
    }, {});
  };
  public async findByIds(ids: number[]): Promise<Device[]> {
    return await this.repository.findByIds(ids);
  }

  public async findByIdsWithoutGroupIdsAssignedImpliesWithoutReservation(ids: number[]): Promise<Device[]> {
    console.log("ids", ids)
    return await this.repository.find({
      where: {
        //id: In(ids), groupId: IsNull()
        id: In(ids)
        //, groupId: IsNull()
      }
    });
  }

  async findOne(
    id: number,
    options?: FindOneOptions<Device>,
  ): Promise<Device | null> {
    return (await this.repository.findOne(id, options)) ?? null;
  }

  async findReads(meterId: string): Promise<DeviceDTO | null> {
    return (
      (await this.repository.findOne({ where: { externalId: meterId } })) ??
      null
    );
  }

  async findDeviceByDeveloperExternalId(meterId: string, organizationId: number): Promise<Device | null> {
    //change whare condition filter by developerExternalId instead of externalId and organizationid
    return (
      (await this.repository.findOne({
        where: {
          developerExternalId: meterId,
          organizationId: organizationId
        }
      })) ??
      null
    );
  }
  async findMultipleDevicesBasedExternalId(
    meterIdList: Array<string>,
  ): Promise<Array<DeviceDTO | null>> {
    console.log("meterIdList", meterIdList);
    return (
      (await this.repository.find({
        where: { externalId: In(meterIdList) },
      })) ?? null
    );
  }

  public async seed(
    orgCode: number,
    newDevice: NewDeviceDTO,
  ): Promise<Device['id']> {
    const storedDevice = await this.repository.save({
      ...newDevice,
      organizationId: orgCode,
    });

    return storedDevice.id;
  }

  public async register(
    orgCode: number,
    newDevice: NewDeviceDTO,
  ): Promise<Device> {
    console.log(orgCode);
    console.log(newDevice);
    const code = newDevice.countryCode.toUpperCase();
    newDevice.countryCode = code;
    let sdgbbenifitslist = SDGBenefits;

    const checkexternalid = await this.repository.findOne({
      where: {
        developerExternalId: newDevice.externalId,
        organizationId: orgCode

      }
    });
    console.log(checkexternalid)
    if (checkexternalid != undefined) {
      console.log("236");
      // return new Promise((resolve, reject) => {
      //   reject(
      //     new ConflictException({
      //       success: false,
      //       message: `ExternalId already exist in this organization, can't add entry with same external id ${newDevice.externalId}`,

      //     })
      //   );
      // });
      throw new ConflictException({
        success: false,
        message: `ExternalId already exist in this organization, can't add entry with same external id ${newDevice.externalId}`,
      })
      // return new NotFoundException(`ExternalId already exist in this organization, can't add entry with same external id ${newDevice.externalId}`);
    }
    newDevice.developerExternalId = newDevice.externalId;
    newDevice.externalId = uuid();
    console.log(newDevice.developerExternalId)
    //@ts-ignore
    if (newDevice.SDGBenefits === 0 || newDevice.SDGBenefits === 1) {
      newDevice.SDGBenefits = []
    } else if (Array.isArray(newDevice.SDGBenefits)) {
      newDevice.SDGBenefits.forEach(
        (sdgbname: string, index: number) => {
          let foundEle = sdgbbenifitslist.find(ele => ele.name.toLowerCase() === sdgbname.toString().toLowerCase());
          if (foundEle) {
            newDevice.SDGBenefits[index] = foundEle.value
          }
          else {
            newDevice.SDGBenefits[index] = 'invalid';
          }
        });
      newDevice.SDGBenefits = newDevice.SDGBenefits.filter(ele => ele !== 'invalid');
    } else {
      newDevice.SDGBenefits = []
    }
    const result = await this.repository.save({
      ...newDevice,
      organizationId: orgCode,
    });
    result.externalId = result.developerExternalId;
    delete result["developerExternalId"];
    return result
  }
  async update(
    organizationId: number,
    role: Role,
    externalId: string,
    updateDeviceDTO: UpdateDeviceDTO,
  ): Promise<Device> {
    const rule =
      role === Role.DeviceOwner
        ? {
          where: {
            organizationId,
          },
        }
        : undefined;
    console.log(rule);
    let currentDevice = await this.findDeviceByDeveloperExternalId(externalId, organizationId);
    if (!currentDevice) {
      throw new NotFoundException(`No device found with id ${externalId}`);
    }
    updateDeviceDTO.developerExternalId = updateDeviceDTO.externalId;
    console.log(updateDeviceDTO.countryCode);
    // const code = updateDeviceDTO.country.toUpperCase();
    updateDeviceDTO.externalId = currentDevice.externalId;
    let sdgbbenifitslist = SDGBenefits;

    //@ts-ignore
    if (updateDeviceDTO.SDGBenefits === 0 || updateDeviceDTO.SDGBenefits === 1) {
      updateDeviceDTO.SDGBenefits = []
    } else if (Array.isArray(updateDeviceDTO.SDGBenefits)) {
      updateDeviceDTO.SDGBenefits.forEach(
        (sdgbname: string, index: number) => {
          let foundEle = sdgbbenifitslist.find(ele => ele.name.toLowerCase() === sdgbname.toString().toLowerCase());
          if (foundEle) {
            updateDeviceDTO.SDGBenefits[index] = foundEle.value
          }
          else {
            updateDeviceDTO.SDGBenefits[index] = 'invalid';
          }
        });
      updateDeviceDTO.SDGBenefits = updateDeviceDTO.SDGBenefits.filter(ele => ele !== 'invalid');
    } else {
      updateDeviceDTO.SDGBenefits = []
    }
    currentDevice = defaults(updateDeviceDTO, currentDevice);
    currentDevice.status = DeviceStatus.Submitted;
    const result = await this.repository.save(currentDevice);
    result.externalId = result.developerExternalId;
    delete result["developerExternalId"];
    console.log(result);
    return result;
  }

  async findUngrouped(
    organizationId: number,
    orderFilterDto: DeviceGroupByDTO,
  ): Promise<GroupedDevicesDTO[]> {
    const devices = await this.repository.find({
      where: { groupId: null, organizationId },
    });
    return this.groupDevices(orderFilterDto, devices);
  }

  getDeviceTypes(): CodeNameDTO[] {
    return IREC_DEVICE_TYPES;
  }

  getFuelTypes(): CodeNameDTO[] {
    return IREC_FUEL_TYPES;
  }

  isValidDeviceType(deviceType: string): boolean {
    return !!this.getDeviceTypes().find((device) => device.code === deviceType);
  }

  isValidFuelType(fuelType: string): boolean {
    return !!this.getFuelTypes().find((fuel) => fuel.code === fuelType);
  }

  groupDevices(
    orderFilterDto: DeviceGroupByDTO,
    devices: Device[],
  ): GroupedDevicesDTO[] {
    const { orderBy } = orderFilterDto;
    const orderByRules: DeviceOrderBy[] = Array.isArray(orderBy)
      ? orderBy
      : [orderBy];
    const groupedDevicesByProps: DeviceDTO[][] = groupByProps(
      devices,
      (item) => {
        return [
          ...orderByRules.map((order: DeviceOrderBy) => {
            if (DeviceSortPropertyMapper[order]) {
              const deviceKey: DeviceKey = DeviceSortPropertyMapper[
                order
              ] as DeviceKey;
              //@ts-ignore
              return item[deviceKey];
            }
          }),
        ];
      },
    );
    const groupedDevices: GroupedDevicesDTO[] = groupedDevicesByProps.map(
      (devices: DeviceDTO[]) => {
        return {
          name: this.getDeviceGroupNameFromGroupedDevices(
            devices,
            orderByRules,
          ),
          devices: devices.map(
            (device: UngroupedDeviceDTO): UngroupedDeviceDTO => {
              return {
                ...device,
                commissioningDateRange: getDateRangeFromYear(
                  device.commissioningDate,
                ),
                capacityRange: getCapacityRange(device.capacity),
                selected: true,
              };
            },
          ),
        };
      },
    );
    return groupedDevices;
  }

  private getDeviceGroupNameFromGroupedDevices(
    devices: DeviceDTO[],
    orderByRules: DeviceOrderBy[],
  ): string {
    const name = `${orderByRules.map((orderRule: DeviceOrderBy) => {
      const deviceKey: DeviceKey = DeviceSortPropertyMapper[
        orderRule
      ] as DeviceKey;
      if (deviceKey === 'fuelCode') {
        return getFuelNameFromCode(devices[0][deviceKey]);
      }
      if (deviceKey === 'deviceTypeCode') {
        return getDeviceTypeFromCode(devices[0][deviceKey]);
      }
      //@ts-ignore
      return devices[0][deviceKey];
    })}`;
    return name;
  }

  private getFilteredQuery(filter: FilterDTO): FindManyOptions<Device> {
    const where: FindConditions<Device> = cleanDeep({
      fuelCode: filter.fuelCode,
      deviceTypeCode: filter.deviceTypeCode,
      //installationConfiguration: filter.installationConfiguration,
      capacity: filter.capacity,
      gridInterconnection: filter.gridInterconnection,
      offTaker: filter.offTaker,
      //sector: filter.sector,
      labels: filter.labels,
      //standardCompliance: filter.standardCompliance,
      country: filter.country && getCodeFromCountry(filter.country),
      commissioningDate:
        filter.start_date &&
        filter.end_date &&
        Between(filter.start_date, filter.end_date),

    });
    const query: FindManyOptions<Device> = {
      where,
      order: {
        organizationId: 'ASC',
      },
    };
    return query;
  }

  public async addGroupIdToDeviceForReserving(
    currentDevice: Device,
    groupId: number
  ): Promise<Device> {
    currentDevice.groupId = groupId;
    return await this.repository.save(currentDevice);
  }

  public async addToGroup(
    currentDevice: Device,
    groupId: number,
    organizationOwnerCode?: number,
  ): Promise<Device> {
    const deviceExists = await this.getDeviceForGroup(
      currentDevice.id,
      groupId,
    );
    if (deviceExists) {
      const message = `Device with id: ${currentDevice.id} already added to this group`;
      this.logger.error(message);
      throw new ConflictException({
        success: false,
        message,
      });
    }
    if (currentDevice.groupId) {
      const message = `Device with id: ${currentDevice.id} already belongs to a group`;
      this.logger.error(message);
      throw new ConflictException({
        success: false,
        message,
      });
    }
    if (
      organizationOwnerCode &&
      currentDevice.organizationId !== organizationOwnerCode
    ) {
      throw new NotAcceptableException(
        `Device with id: ${currentDevice.id} belongs to a different owner`,
      );
    }
    currentDevice.groupId = groupId;
    return await this.repository.save(currentDevice);
  }

  public async removeFromGroup(
    deviceId: number,
    groupId: number,
  ): Promise<Device> {
    const currentDevice = await this.getDeviceForGroup(deviceId, groupId);
    if (!currentDevice) {
      // throw new NotFoundException(
      //   `No device found with id ${deviceId} and groupId: ${groupId}`,
      // );
      console.error(`in removeFromGroup 373 No device found with id ${deviceId} and groupId: ${groupId}`);
    }
    currentDevice ? currentDevice.groupId = null : '';

    return await this.repository.save(currentDevice);
  }

  private async getDeviceForGroup(
    deviceId: number,
    groupId: number,
  ): Promise<Device | undefined> {
    return this.repository.findOne({
      where: {
        id: deviceId,
        groupId,
      },
    });
  }
  public async updatereadtype(
    deviceId: string,
    meterReadtype: string,
  ): Promise<Device> {

    const devicereadtype = await this.repository.findOne({
      where: {
        externalId: deviceId,
      }
    });
    if (!devicereadtype) {
      throw new NotFoundException(`No device found with id ${deviceId}`);
    }
    devicereadtype.meterReadtype = meterReadtype;

    return await this.repository.save(devicereadtype);

  }

  //
  private getBuyerFilteredQuery(filter: BuyerDeviceFilterDTO): FindManyOptions<Device> {
    const where: FindConditions<Device> = cleanDeep({

      fuelCode: filter.fuelCode,
      deviceTypeCode: filter.deviceTypeCode,
      capacity: filter.capacity && LessThanOrEqual(filter.capacity),
      offTaker: filter.offTaker,
      country: filter.country && getCodeFromCountry(filter.country),


    });
    console.log(where);
    const query: FindManyOptions<Device> = {
      where,
      order: {
        organizationId: 'ASC',
      },
    };
    return query;
  }
  public async finddeviceForBuyer(filterDto: BuyerDeviceFilterDTO): Promise<Device[]> {

    let query = this.getBuyerFilteredQuery(filterDto);

    let where: any = query.where

    where = { ...where, groupId: null };

    query.where = where;
    return this.repository.find(query);
  }


  public async AddCertificateIssueDateLogForDevice(params: CheckCertificateIssueDateLogForDeviceEntity
  ): Promise<CheckCertificateIssueDateLogForDeviceEntity> {
    return await this.checkdevcielogcertificaterepository.save({
      ...params,

    });
  }
  // public getCheckCertificateIssueDateLogForDevice(deviceid: string,
  //   startDate: Date,
  //   endDate: Date
  // ): SelectQueryBuilder<CheckCertificateIssueDateLogForDeviceEntity[]> {
  //   // const groupId = await this.checkdevcielogcertificaterepository.find({
  //   //   where: {
  //   //     deviceid: deviceId,
  //   //     certificate_issuance_startdate: startDate && endDate && Between(startDate, endDate),
  //   //     certificate_issuance_enddate: startDate && endDate && Between(startDate, endDate),
  //   //   },
  //   // });
  //   console.log(deviceid)
  //   const groupId = this.checkdevcielogcertificaterepository
  //     .createQueryBuilder()
  //     .where("deviceid = :deviceid", { deviceid: deviceid })
  //     .andWhere(
  //       new Brackets((db) => {
  //         db.where("certificate_issuance_startdate BETWEEN :startDateFirstWhere AND :endDateFirstWhere ", { startDateFirstWhere: startDate, endDateFirstWhere: endDate })
  //           .orWhere("certificate_issuance_enddate BETWEEN :startDateSecondtWhere AND :endDateSecondWhere", { startDateFirstWhere: startDate, endDateFirstWhere: endDate })
  //           .orWhere(":startdateThirdWhere BETWEEN certificate_issuance_startdate AND certificate_issuance_enddate", { startdateThirdWhere: startDate })
  //           .orWhere(":enddateforthdWhere BETWEEN certificate_issuance_startdate AND certificate_issuance_enddate", { enddateThirdWhere: endDate })

  //       }),
  //     ).getMany();
  //   console.log(groupId);
  //   return groupId
  // }
  public async getCheckCertificateIssueDateLogForDevice(deviceid: string,
    startDate: Date,
    endDate: Date): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
    const query = this.getdevcielogFilteredQuery(deviceid,
      startDate,
      endDate);
    try {

      const device = await query.getRawMany();
      const devices = device.map((s: any) => {
        const item: any = {
          certificate_issuance_startdate: s.device_certificate_issuance_startdate,
          certificate_issuance_enddate: s.device_certificate_issuance_enddate,
          readvalue_watthour: s.device_readvalue_watthour,
          status: s.device_status,
          deviceid: s.device_deviceid
        };
        return item;
      });

      return devices;
    } catch (error) {
      this.logger.error(`Failed to retrieve users`, error.stack);
      //  throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  private getdevcielogFilteredQuery(deviceid: string,
    startDate: Date,
    endDate: Date): SelectQueryBuilder<CheckCertificateIssueDateLogForDeviceEntity> {
    //  const { organizationName, status } = filterDto;
    const query = this.checkdevcielogcertificaterepository
      .createQueryBuilder("device").
      where("device.deviceid = :deviceid", { deviceid: deviceid })
      .andWhere(
        new Brackets((db) => {
          db.where("device.status ='Requested' OR device.status ='Succeeded'")
        }))
      .andWhere(
        new Brackets((db) => {
          db.where("device.certificate_issuance_startdate BETWEEN :startDateFirstWhere AND :endDateFirstWhere ", { startDateFirstWhere: startDate, endDateFirstWhere: endDate })
            .orWhere("device.certificate_issuance_enddate BETWEEN :startDateSecondtWhere AND :endDateSecondWhere", { startDateSecondtWhere: startDate, endDateSecondWhere: endDate })
            .orWhere(":startdateThirdWhere BETWEEN device.certificate_issuance_startdate AND device.certificate_issuance_enddate", { startdateThirdWhere: startDate })
            .orWhere(":enddateforthdWhere BETWEEN device.certificate_issuance_startdate AND device.certificate_issuance_enddate", { enddateforthdWhere: endDate })

        }),
      )
    //   console.log(query)
    // console.log(query.getQuery())
    return query;
  }

  async getallread(meterId: string,): Promise<Array<{ timestamp: Date, value: number }>> {
    const fluxQuery =
      `from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: 0)
        |> filter(fn: (r) => r.meter == "${meterId}" and r._field == "read")`
    return await this.execute(fluxQuery);
  }
  async execute(query: any) {

    const data = await this.dbReader.collectRows(query);
    return data.map((record: any) => ({
      timestamp: new Date(record._time),
      value: Number(record._value),
    }));
  }
  get dbReader() {
    // const url = 'http://localhost:8086';
    // const token = 'admin:admin'
    // const org = '';

    //@ts-ignore
    const url = process.env.INFLUXDB_URL;
    //@ts-ignore
    const token = process.env.INFLUXDB_TOKEN;
    //@ts-ignore
    const org = process.env.INFLUXDB_ORG;

    //@ts-ignore
    return new InfluxDB({ url, token }).getQueryApi(org)
  }

  async getOrganizationDevicesTotal(organizationId: number): Promise<Device[]> {
    console.log(organizationId);
    const devices = await this.repository.find({
      where: { organizationId },
    });
    let totalamountofreads = [];
    await Promise.all(
      devices.map(async (device: Device) => {

        let certifiedamountofread = await this.checkdevcielogcertificaterepository.find(
          {
            where: { deviceid: device.externalId }
          }
        )
        const totalcertifiedReadValue = certifiedamountofread.reduce(
          (accumulator, currentValue) => accumulator + currentValue.readvalue_watthour,
          0,
        );
        let totalamount = await this.getallread(device.externalId);
        const totalReadValue = totalamount.reduce(
          (accumulator, currentValue) => accumulator + currentValue.value,
          0,
        );
        totalamountofreads.push({
          devicename: device.externalId,
          totalcertifiedReadValue: totalcertifiedReadValue,
          totalReadValue: totalReadValue
        })

      }))

    console.log(totalamountofreads);
    return totalamountofreads;
  }

  // @Cron(CronExpression.EVERY_30_SECONDS)
  // //@Cron('*/3 * * * *')
  // async updateExternalIdtoDeveloperExternalId() : Promise<void>{
  //   let alldevices:Device[];
  //   alldevices= await this.repository.find();
  //   console.log(alldevices);
  //   await Promise.all(
  //     alldevices.map(async (device: Device) => {
  //       device.developerExternalId = device.externalId;
  //       await this.repository.save(device);

  //     })
  //   );
  // }

  public async changeDeviceCreatedAt(externalId, onboardedDate, givenDate) {
    const numberOfHistReads: number = await this.getNumberOfHistReads(externalId);
    const numberOfOngReads: number = await this.getNumberOfOngReads(externalId, onboardedDate);

    if (numberOfHistReads <= 0 && numberOfOngReads <= 0)
    //no reads exist for the given device
    //So we can change the date
    {
      return this.changecreatedAtDate(onboardedDate, givenDate, externalId);
    }


    else//If reads exist for the given device
    {
      throw new HttpException('The given device already had some meter reads;Thus you cannot change the createdAt', 409);
    }
  }



  async getNumberOfHistReads(deviceId): Promise<number> {
    const query = this.historyrepository.createQueryBuilder("devicehistory")
      .where("devicehistory.deviceId = :deviceId", { deviceId });
    const count = await query.getCount();
    return count;
  }



  async getNumberOfOngReads(externalId, onboardedDate): Promise<number> {
    let fluxQuery = ``;
    const end = new Date();
    fluxQuery = `from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: ${onboardedDate})
      |> filter(fn: (r) => r._measurement == "read"and r.meter == "${externalId}")
      |> count()`;
    let noOfReads = await this.ongExecute(fluxQuery);

    return noOfReads;
  }


  async ongExecute(query: any) {
    console.log("query started")
    const data: any = await this.dbReader.collectRows(query);
    console.log("query ended");

    if (typeof data[0] === 'undefined' || data.length == 0) {
      return 0;
    }
    return Number(data[0]._value);
  }


  async changecreatedAtDate(onboardedDate, givenDate, externalId) {
    console.log("THE EXTERNALID IS::::::::::::::::::::::::"+externalId);
    const sixMonthsAgo = new Date(onboardedDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (new Date(givenDate) < sixMonthsAgo || new Date(givenDate) >= new Date(onboardedDate)) {
      throw new HttpException('Given date is more than 6 months before the onboarded date or after or equal to the onboarded date', 400);
    }

    await this.repository.update(
      { createdAt: onboardedDate, externalId: externalId },
      { createdAt: givenDate },
    );
    return `Changed createdAt date from ${onboardedDate} to ${givenDate}`;
  }
}