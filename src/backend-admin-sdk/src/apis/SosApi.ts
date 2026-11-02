/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0022): riders' SOS incidents.
 * GET /api/admin/v1/sos?status=current|closed, GET .../{id}, POST .../{id}/close.
 * Times arrive as ISO strings (UTC); the UI shows them in Athens time.
 */

import * as runtime from '../runtime';

// Active (the rider's phone shares its position), awaiting close (the rider said safe or false
// alarm), or closed by an admin.
export type SosIncidentState = 'ACTIVE' | 'AWAITING_CLOSE' | 'CLOSED';

export type SosOutcome = 'RIDER_SAFE' | 'HELP_ARRIVED' | 'FALSE_ALARM' | 'OTHER';

export interface SosIncidentAdminDto {
    id: string;
    state: SosIncidentState;
    courier: { id: string; firstName: string; lastName: string };
    deliveryId: string | null;
    startedAt: string;
    createdAt: string;
    safeAt: string | null;
    falseAlarmAt: string | null;
    closedAt: string | null;
    closedBy: { id: string; email: string | null; username: string | null } | null;
    outcome: SosOutcome | null;
    note: string | null;
    pointsDeletedAt: string | null;
}

export interface SosPointAdminDto {
    latitude: number;
    longitude: number;
    accuracyMetres: number | null;
    recordedAt: string;
}

export interface SosIncidentDetailAdminDto extends SosIncidentAdminDto {
    points: SosPointAdminDto[];
}

export interface SosIncidentPageAdminDto {
    data: SosIncidentAdminDto[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface SosCloseAdminInput {
    outcome: SosOutcome;
    note?: string | null;
}

const basePath = '/api/admin/v1/sos';

export class SosApi extends runtime.BaseAPI {
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

    // Active and awaiting close, all of them: the banner every admin page polls.
    async current(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SosIncidentAdminDto[]> {
        const response = await this.request({ path: basePath, method: 'GET', headers: await this.authHeaders(), query: { status: 'current' } }, initOverrides);
        return await new runtime.JSONApiResponse<SosIncidentAdminDto[]>(response).value();
    }

    // Closed ones, one page, newest first.
    async closed(page: number, limit: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SosIncidentPageAdminDto> {
        const response = await this.request({ path: basePath, method: 'GET', headers: await this.authHeaders(), query: { status: 'closed', page, limit } }, initOverrides);
        return await new runtime.JSONApiResponse<SosIncidentPageAdminDto>(response).value();
    }

    async findOne(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SosIncidentDetailAdminDto> {
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<SosIncidentDetailAdminDto>(response).value();
    }

    async close(id: string, input: SosCloseAdminInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SosIncidentAdminDto> {
        const headers = await this.authHeaders();
        headers['Content-Type'] = 'application/json';
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}/close`, method: 'POST', headers, query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<SosIncidentAdminDto>(response).value();
    }
}
