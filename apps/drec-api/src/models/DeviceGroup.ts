import {
  CapacityRange,
  CommissioningDateRange,
  Installation,
  OffTaker,
  Sector,
  StandardCompliance,
} from '../utils/enums';
import { DeviceDTO } from '../pods/device/dto';
import { OrganizationDTO } from '../pods/organization/dto';

export enum BuyerReservationCertificateGenerationFrequency {
  hourly ='hourly',
  daily='daily',
  weekly='weekly',
  monhtly ='monthly',
  quarterly ='quarterly'
}

export interface IDeviceGroup {
  id: number;
  name: string;
  organizationId: number;
  fuelCode: string;
  countryCode: string;
  //standardCompliance: StandardCompliance;

  deviceTypeCodes: string[];
  offTakers: OffTaker[];
  //installationConfigurations: Installation[];
  //sectors: Sector[];
  gridInterconnection: boolean; // True - all devices have gridInterconnection true, if one has false, then this value is false
  aggregatedCapacity: number; // total capacity of all devices beloning to this group

  capacityRange: CapacityRange;
  commissioningDateRange: CommissioningDateRange[];

  yieldValue?: number; // ideally all underlying devices should have the same, otherwise take average?

  labels?: string[];

  leftoverReads?: number; // in KW

  devices?: DeviceDTO[];
  organization?: Pick<OrganizationDTO, 'name'>;

  buyerId?: number | null;
  buyerAddress?: string | null;
  type?:string | null;
}
