import { OrganizationDTO } from '@energyweb/origin-drec-api-client';
import { Check } from '@material-ui/icons';
import { useAllOrganizations, useOrgApproveHandler } from '../../../api';
import { useAllOrganizationsTableLogic } from '../../logic';

export const useAllOrganizationsPageEffects = () => {
    const { organizations, organizationsLoading } = useAllOrganizations();

    const approveHandler = useOrgApproveHandler();

    const actions = [
        {
            icon: <Check />,
            name: 'Approve',
            onClick: (id: OrganizationDTO['id']) => approveHandler(id)
        }
    ];
    const tableProps = useAllOrganizationsTableLogic({
        allOrganizations: organizations as OrganizationDTO[],
        actions,
        isLoading: organizationsLoading
    });

    return tableProps;
};
