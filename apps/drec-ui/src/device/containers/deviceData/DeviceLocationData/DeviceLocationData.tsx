import { Grid, Typography } from '@material-ui/core';
import { CoordinatesLogo } from '@energyweb/origin-ui-assets';
import React, { FC } from 'react';
import { IconText } from '@energyweb/origin-ui-core';
import { useStyles } from './DeviceLocationData.styles';
import { GermanyFlag } from '../../../../assets';

export interface DeviceLocationDataProps {
    owner: string;
    location: string;
    coordinates: string;
}

export const DeviceLocationData: FC<DeviceLocationDataProps> = ({
    owner,
    location,
    coordinates
}) => {
    const classes = useStyles();
    return (
        <div className={classes.wrapper}>
            <Grid container alignItems="center" my={1}>
                <Typography className={classes.owner}>{owner}</Typography>
            </Grid>
            <IconText icon={GermanyFlag} title={location} />
            <IconText icon={CoordinatesLogo} title={coordinates} />
        </div>
    );
};