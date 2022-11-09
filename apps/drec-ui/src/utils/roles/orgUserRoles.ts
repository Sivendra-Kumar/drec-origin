import { Role } from '@energyweb/origin-drec-api-client';

export const roleNamesMatcherForMembersPage = [
    {
        value: Role.OrganizationAdmin,
        label: 'Organization Admin'
    },
    {
        value: Role.DeviceOwner,
        label: 'Device Owner'
    }
];

export const roleNamesMembersPage = () => [
    {
        value: Role.OrganizationAdmin,
        label: 'Admin'
    },
    {
        value: Role.DeviceOwner,
        label: 'Device Owner'
    }
];

export const roleNamesInvitePage = () => [
    {
        value: Role.DeviceOwner,
        label: 'Device Owner'
    },
    {
        value: Role.User,
        label: 'User'
    }
];
