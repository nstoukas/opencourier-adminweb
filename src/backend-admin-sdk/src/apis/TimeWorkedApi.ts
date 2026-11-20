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
    // Spec 0042 (AC-8, AC-12): restaurant to customer km from the quote, the drop off area (a street or
    // a town, never a door), arrival to pickup in seconds, and how the job ended (null: delivered).
    paidKm: number | null;
    dropoffArea: string | null;
    pickupWaitSeconds: number | null;
    cancelledAfterPickup: boolean;
    endLabel: JobEndLabel | null;
}

// Spec 0042 (AC-8): how a job ended when not in this rider's drop off.
export type JobEndLabel =
    | 'CANCELLED_AFTER_PICKUP'
    | 'CANCELLED'
    | 'REMOVED'
    | 'HANDED_BACK'
    | 'REASSIGNED'
    | 'FAILED'
    | 'ENDED'
    | 'IN_PROGRESS';

// Spec 0042 (AC-1): the figures of one day or one week, worked out on the server.
export interface EarningsFiguresDto {
    workSeconds: number;
    jobSeconds: number;
    paidWaitSeconds: number;
    unpaidSeconds: number;
    // Includes unlinkedMoneyCents; every rate leaves it out.
    moneyCents: number;
    unlinkedMoneyCents: number;
    // The part of unlinkedMoneyCents linked to no job at all.
    noJobMoneyCents: number;
    centsPerHour: number | null;
    activeCentsPerHour: number | null;
    paidKm: number;
    centsPerPaidKm: number | null;
    medianPickupWaitSeconds: number | null;
    pickupWaitCount: number;
    dropOffCount: number;
}

export interface EarningsWeekDto extends EarningsFiguresDto {
    // The Monday, YYYY-MM-DD.
    weekStart: string;
    // The week holds today.
    soFar: boolean;
    // Always false for an admin: admins have no reach limit.
    cutAtReach: boolean;
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

// A day carries the same figures as a week (spec 0042).
export interface WorkedDayDto extends EarningsFiguresDto {
    date: string;
}

export interface CourierTimeWorkedDto {
    // Spec 0042: the days asked for, as the server read them.
    from: string;
    to: string;
    // When recording began for the instance; null while nothing is recorded.
    recordedFrom: string | null;
    currencyCode: string;
    days: WorkedDayDto[];
    // Spec 0042: every Monday to Sunday week that overlaps the range, with its own figures.
    weeks: EarningsWeekDto[];
    // Shifts overlapping the range, each with only the jobs accepted inside it.
    shifts: WorkedShiftDto[];
    // Spec 0042: jobs in the range that sit in no recorded shift.
    jobsInNoShift: WorkedJobDto[];
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
