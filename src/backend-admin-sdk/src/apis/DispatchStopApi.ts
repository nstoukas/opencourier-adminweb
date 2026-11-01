/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0014): stopping dispatch for heat or a storm.
 * GET /api/admin/v1/dispatch-stops, GET .../preview, POST (stop now or schedule), POST .../{id}/end.
 * Times arrive as ISO strings (UTC); the UI shows them in Athens time.
 */

import * as runtime from '../runtime';

export type DispatchStopReason = 'HEAT' | 'STORM' | 'OTHER';

export interface DispatchStopAdminDto {
    id: string;
    reason: DispatchStopReason;
    startsAt: string;
    endsAt: string | null;
    createdByUserId: string;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    endedByUserId: string | null;
    cancelledAt: string | null;
    cancelledByUserId: string | null;
    endWorkDoneAt: string | null;
}

export interface DispatchStopOverviewAdminDto {
    current: DispatchStopAdminDto | null;
    scheduled: DispatchStopAdminDto[];
    history: DispatchStopAdminDto[];
}

export interface DispatchStopPreviewAdminDto {
    offersToEnd: number;
    deliveriesToReturn: number;
}

// A date (YYYY-MM-DD) and a time (HH:mm) in Athens time, as the admin typed them.
export interface LocalDateTimeAdminInput {
    date: string;
    time: string;
}

// Stop now: no startsOn (endsOn optional). Schedule: startsOn and endsOn.
export interface DispatchStopCreateAdminInput {
    reason: DispatchStopReason;
    startsOn?: LocalDateTimeAdminInput;
    endsOn?: LocalDateTimeAdminInput;
}

const basePath = '/api/admin/v1/dispatch-stops';

export class DispatchStopApi extends runtime.BaseAPI {
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

    async overview(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DispatchStopOverviewAdminDto> {
        const response = await this.request({ path: basePath, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<DispatchStopOverviewAdminDto>(response).value();
    }

    async preview(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DispatchStopPreviewAdminDto> {
        const response = await this.request({ path: `${basePath}/preview`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<DispatchStopPreviewAdminDto>(response).value();
    }

    async create(input: DispatchStopCreateAdminInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DispatchStopAdminDto> {
        const headers = await this.authHeaders();
        headers['Content-Type'] = 'application/json';
        const response = await this.request({ path: basePath, method: 'POST', headers, query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<DispatchStopAdminDto>(response).value();
    }

    // Restart dispatch (a stop that is on) or cancel a scheduled stop.
    async end(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DispatchStopAdminDto> {
        const response = await this.request({
            path: `${basePath}/${encodeURIComponent(id)}/end`,
            method: 'POST',
            headers: await this.authHeaders(),
            query: {},
        }, initOverrides);
        return await new runtime.JSONApiResponse<DispatchStopAdminDto>(response).value();
    }
}
