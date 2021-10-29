import { FormSelectOption, GenericFormProps } from '@energyweb/origin-ui-core';
import * as yup from 'yup';
import { COUNTRY_OPTIONS_ISO } from '@energyweb/origin-ui-utils';
import { CodeNameDTO } from '@energyweb/origin-drec-api-client';
import {
    prepareFuelTypeOptions,
    StandardCompliance,
    Installation,
    OffTaker,
    Sector,
    CommissioningDateRange,
    CapacityRange,
    prepareDeviceGroupEnumOptions
} from '../../../../utils';

export type UnreservedFormFormValues = {
    country: FormSelectOption[];
    fuelCode: FormSelectOption[];
    installationConfiguration: string;
    offTaker: string;
    sector: string;
    standardCompliance: string;
    gridInterconnection: string;
    commissioningDateRange: string;
    capacityRange: string;
};

type TUnreservedFormFormLogic = (
    initialValues: UnreservedFormFormValues,
    allFuelTypes: CodeNameDTO[],
    resetForm: () => void
) => Omit<GenericFormProps<UnreservedFormFormValues>, 'submitHandler'>;

export const useUnreservedFilterFormLogic: TUnreservedFormFormLogic = (
    initialValues: UnreservedFormFormValues,
    allFuelTypes: CodeNameDTO[],
    resetForm: () => void
) => {
    const gridInterconnectionOptions: FormSelectOption[] = [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' }
    ];
    return {
        initialValues,
        validationSchema: yup.object({
            country: yup.array().label('Country'),
            fuelCode: yup.array().label('Fuel type'),
            installationConfiguration: yup.string().label('Installation Configuration'),
            offTaker: yup.string().label('Offtaker'),
            sector: yup.string().label('Offtaker Sector'),
            standardCompliance: yup.string().label('Standard Compliance'),
            gridInterconnection: yup.string().label('gridInterconnection'),
            commissioningDateRange: yup.string().label('Commissioning Date Range'),
            capacityRange: yup.string().label('Capacity Range')
        }),
        fields: [
            {
                name: 'country',
                label: 'Country',
                select: true,
                multiple: false,
                autocomplete: true,
                options: COUNTRY_OPTIONS_ISO
            },
            {
                name: 'fuelCode',
                label: 'Fuel type',
                select: true,
                autocomplete: true,
                options: prepareFuelTypeOptions(allFuelTypes)
            },
            {
                name: 'installationConfiguration',
                label: 'Installation Configuration',
                select: true,
                options: prepareDeviceGroupEnumOptions(Object.values(Installation))
            },
            {
                name: 'offTaker',
                label: 'OffTaker',
                select: true,
                options: prepareDeviceGroupEnumOptions(Object.values(OffTaker))
            },
            {
                name: 'sector',
                label: 'Sector',
                select: true,
                options: prepareDeviceGroupEnumOptions(Object.values(Sector))
            },
            {
                name: 'standardCompliance',
                label: 'Standard Compliance',
                select: true,
                options: prepareDeviceGroupEnumOptions(Object.values(StandardCompliance))
            },
            {
                name: 'gridInterconnection',
                label: 'Grid Interconnection',
                select: true,
                options: gridInterconnectionOptions
            },
            {
                name: 'commissioningDateRange',
                label: 'Commissioning Date Range',
                select: true,
                options: prepareDeviceGroupEnumOptions(Object.values(CommissioningDateRange))
            },
            {
                name: 'capacityRange',
                label: 'Capacity Range',
                select: true,
                options: prepareDeviceGroupEnumOptions(Object.values(CapacityRange))
            }
        ],
        validationMode: 'onSubmit',
        inputsVariant: 'filled',
        buttonText: 'Filter',
        secondaryButtons: [
            {
                variant: 'outlined',
                style: { marginRight: 20 },
                label: 'Reset',
                onClick: resetForm
            }
        ],
        buttonDisabled: false,
        acceptInitialValues: true
    };
};
