import { Typography } from '@material-ui/core';
import { FC } from 'react';
import { DeviceDTO } from '@energyweb/origin-drec-api-client';
import { useStyles } from './ItemHighlightedContent.styles';

export const ItemHighlightedContent: FC<DeviceDTO> = ({ projectName, organizationId, id }) => {
    const classes = useStyles();
    return (
        <div>
            <Typography variant="h6" className={classes.text} gutterBottom>
                <b>{projectName}</b>
            </Typography>
            <Typography className={classes.text} paragraph>
                <b>
                    {'Organization'} id: {organizationId}
                </b>
            </Typography>
            <a className={classes.link} href={`device/detail-view/${id}`}>
                {'See More'}
            </a>
        </div>
    );
};