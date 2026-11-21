/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0051, row 108): rider account upkeep.
 * POST /api/admin/v1/courier/{id}/deactivate { reason } (409 holds a job, open SOS, an admin, already),
 * POST /{id}/reactivate { reason? } (409 not deactivated), GET /{id}/account (login email, deactivation,
 * emergency contact), GET /{id}/account-changes (newest first). Edits go through CourierApi.updateCourier.
 */

import * as runtime from '../runtime';

export interface CourierAccountAdminDto {
    email: string | null;
    deactivatedAt: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
}

// DEACTIVATED, REACTIVATED, FIELD_EDITED or PASSWORD_CHANGED.
export interface CourierAccountChangeAdminDto {
    id: string;
    kind: string;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    actorIsRider: boolean;
    actorEmail: string | null;
    createdAt: string;
}

const basePath = '/api/admin/v1/courier';

export class CourierAccountApi extends runtime.BaseAPI {
    private async authHeaders(json = false): Promise<runtime.HTTPHeaders> {
        const headers: runtime.HTTPHeaders = {};
        if (json) headers['Content-Type'] = 'application/json';
        if (this.configuration && this.configuration.accessToken) {
            const tokenString = await this.configuration.accessToken('bearer', []);
            if (tokenString) {
                headers['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        return headers;
    }

    async deactivate(id: string, reason: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}/deactivate`, method: 'POST', headers: await this.authHeaders(true), body: { reason } },
            initOverrides
        );
    }

    async reactivate(id: string, reason?: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}/reactivate`, method: 'POST', headers: await this.authHeaders(true), body: reason ? { reason } : {} },
            initOverrides
        );
    }

    async account(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CourierAccountAdminDto> {
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}/account`, method: 'GET', headers: await this.authHeaders() }, initOverrides);
        return await new runtime.JSONApiResponse<CourierAccountAdminDto>(response).value();
    }

    async changes(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CourierAccountChangeAdminDto[]> {
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}/account-changes`, method: 'GET', headers: await this.authHeaders() }, initOverrides);
        return await new runtime.JSONApiResponse<CourierAccountChangeAdminDto[]>(response).value();
    }
}
