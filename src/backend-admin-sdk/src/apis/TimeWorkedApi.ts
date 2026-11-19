/* tslint:disable */
/* eslint-disable */

import * as runtime from '../runtime';

// Spec 0040: a rider's time worked and the co-op totals. Hand written, like the rest of this SDK.
// Times arrive as ISO strings (UTC); durations are whole seconds; money is whole cents in currencyCode.

export type TimeWorkedCourierStatus = 'ONLINE' | 'OFFLINE' | 'LAST_CALL';
export type TimeWorkedChangeCause = 'RIDER' | 'ADMIN' | 'CUT_OFF' | 'LAST_CALL_ACCEPTED' | 'SYSTEM_START';
export type TimeWorkedTotalsBy = 'day' | 'week';

export interface WorkedStatusChangeDto {
    at: string;
    fromStatus: TimeWorkedCourierStatus;
    toStatus: TimeWorkedCourierStatus;
    cause: TimeWorkedChangeCause;
    byAdmin: boolean;
    // The admin's email, else username, on an admin caused change; null otherwise (AC-15).
    adminLabel?: string | null;
}

export interface WorkedCompensationDto {
    id: string;
    reason: string;
    amountCents: number;
    createdAt: string;
    addedLater: boolean;
}

export interface WorkedJobDto {
    deliveryId: string;
    // The restaurant's name.
    pickupName: string;
    acceptedAt: string;
    // null while the rider still holds the delivery.
    endedAt: string | null;
    endEventType: string | null;
    droppedOff: boolean;
    deliveryMoneyCents: number;
    paidWaitSeconds: number;
    compensations: WorkedCompensationDto[];
}

export interface WorkedShiftDto {
    startedAt: string;
    startedBeforeRange: boolean;
    endedAt: string | null;
    onBreakSince: string | null;
    workSeconds: number;
    jobSeconds: number;
    paidWaitSeconds: number;
    unpaidSeconds: number;
    breaks: { startedAt: string; endedAt: string }[];
    moneyCents: number;
    lateMoneyCents: number;
    centsPerHour: number | null;
    currencyCode: string;
    statusChanges: WorkedStatusChangeDto[];
    jobs: WorkedJobDto[];
}

export interface WorkedDayDto {
    date: string;
    workSeconds: number;
    jobSeconds: number;
    paidWaitSeconds: number;
    unpaidSeconds: number;
    // Includes unlinkedMoneyCents; centsPerHour leaves it out.
    moneyCents: number;
    centsPerHour: number | null;
    unlinkedMoneyCents: number;
}

export interface CourierTimeWorkedDto {
    // When recording began for the instance; null while nothing is recorded.
    recordedFrom: string | null;
    currencyCode: string;
    days: WorkedDayDto[];
    shifts: WorkedShiftDto[];
}

// One period of the co-op totals. Never a rider id (AC-16).
export interface TimeWorkedTotalsRowDto {
    // YYYY-MM-DD: the day, or the Monday of the week.
    period: string;
    riderCount: number;
    workSeconds: number;
    jobSeconds: number;
    paidWaitSeconds: number;
    unpaidSeconds: number;
    moneyCents: number;
    unlinkedMoneyCents: number;
    centsPerHour: number | null;
}

export interface TimeWorkedTotalsDto {
    currencyCode: string;
    rows: TimeWorkedTotalsRowDto[];
}

export class TimeWorkedApi extends runtime.BaseAPI {
    private async authHeaders(): Promise<runtime.HTTPHeaders> {
        const headers: runtime.HTTPHeaders = {};
        if (this.configuration && this.configuration.accessToken) {
            const tokenString = await this.configuration.accessToken('bearer', []);
            if (tokenString) {
                headers['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        return headers;
    }

    // `from` and `to` are YYYY-MM-DD days in Europe/Athens, at most 92 days apart.
    async totals(from: string, to: string, by: TimeWorkedTotalsBy, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<TimeWorkedTotalsDto> {
        const response = await this.request({ path: '/api/admin/v1/time-worked-totals', method: 'GET', headers: await this.authHeaders(), query: { from, to, by } }, initOverrides);
        return await new runtime.JSONApiResponse<TimeWorkedTotalsDto>(response).value();
    }

    // One rider's time worked, at most 31 days.
    async forCourier(courierId: string, from: string, to: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CourierTimeWorkedDto> {
        const response = await this.request({ path: `/api/admin/v1/courier/${encodeURIComponent(courierId)}/time-worked`, method: 'GET', headers: await this.authHeaders(), query: { from, to } }, initOverrides);
        return await new runtime.JSONApiResponse<CourierTimeWorkedDto>(response).value();
    }
}
