import { TableComponent } from '@energyweb/origin-ui-core';
import { Skeleton } from '@material-ui/core';
import { FC } from 'react';
import { useMembersPageEffects } from './MembersPage.effects';

export const MembersPage: FC = () => {
    const { tableData, isLoading } = useMembersPageEffects();

    if (isLoading) {
        return <Skeleton height={200} width="100%" />;
    }

    return <TableComponent {...tableData} />;
};
