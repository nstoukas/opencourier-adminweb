/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0026, row 77): the co-op's weekly shift slots.
 * GET /api/admin/v1/shift-slots (?includeRemoved=true), POST, PATCH /{id}, DELETE /{id} (200 with the
 * removed slot), GET /{id}/changes. Times are minutes after midnight in Athens wall time.
 */

import * as runtime from '../runtime';

export interface ShiftSlotAdminDto {
    id: string;
    // ISO weekday: 1 Monday to 7 Sunday.
    weekday: number;
    startMinute: number;
    // 1440 is 24:00.
    endMinute: number;
    riderCap: number;
    createdAt: string;
    updatedAt: string;
    removedAt: string | null;
}

export interface ShiftSlotFieldsAdmin {
    weekday: number;
    startMinute: number;
    endMinute: number;
    riderCap: number;
}

export type ShiftSlotChangeAction = 'CREATED' | 'UPDATED' | 'REMOVED';

export interface ShiftSlotChangeAdminDto {
    id: string;
    action: ShiftSlotChangeAction;
    changedByUserId: string;
    before: ShiftSlotFieldsAdmin | null;
    after: ShiftSlotFieldsAdmin | null;
    createdAt: string;
}

const basePath = '/api/admin/v1/shift-slots';

export class ShiftSlotApi extends runtime.BaseAPI {
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

    async list(includeRemoved = false, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ShiftSlotAdminDto[]> {
        const query: runtime.HTTPQuery = includeRemoved ? { includeRemoved: 'true' } : {};
        const response = await this.request({ path: basePath, method: 'GET', headers: await this.authHeaders(), query }, initOverrides);
        return await new runtime.JSONApiResponse<ShiftSlotAdminDto[]>(response).value();
    }

    async create(input: ShiftSlotFieldsAdmin, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ShiftSlotAdminDto> {
        const response = await this.request({ path: basePath, method: 'POST', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<ShiftSlotAdminDto>(response).value();
    }

    async update(id: string, input: Partial<ShiftSlotFieldsAdmin>, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ShiftSlotAdminDto> {
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}`, method: 'PATCH', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<ShiftSlotAdminDto>(response).value();
    }

    async remove(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ShiftSlotAdminDto> {
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}`, method: 'DELETE', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ShiftSlotAdminDto>(response).value();
    }

    async changes(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ShiftSlotChangeAdminDto[]> {
        const response = await this.request({ path: `${basePath}/${encodeURIComponent(id)}/changes`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ShiftSlotChangeAdminDto[]>(response).value();
    }
}
