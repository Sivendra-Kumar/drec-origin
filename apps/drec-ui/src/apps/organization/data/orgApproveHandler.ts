import {
    getOrganizationControllerGetAllQueryKey,
    OrganizationDTO,
    OrganizationStatus,
    useOrganizationControllerUpdate
} from '@energyweb/origin-drec-api-client';
import { useQueryClient } from 'react-query';
import { NotificationTypeEnum, showNotification } from 'shared';

export const useOrgApproveHandler = () => {
    const { mutate } = useOrganizationControllerUpdate();
    const queryClient = useQueryClient();
    const allOrgsQueryKey = getOrganizationControllerGetAllQueryKey();

    return (id: OrganizationDTO['id']) => {
        mutate(
            { id, data: { status: OrganizationStatus.Active } },
            {
                onSuccess: () => {
                    showNotification(
                        'Organization was successfully approved',
                        NotificationTypeEnum.Success
                    );
                    queryClient.invalidateQueries(allOrgsQueryKey);
                },
                onError: (error: any) => {
                    showNotification(
                        `Error while approving organization:
              ${error?.response?.data?.message || ''}
              `,
                        NotificationTypeEnum.Error
                    );
                }
            }
        );
    };
};
