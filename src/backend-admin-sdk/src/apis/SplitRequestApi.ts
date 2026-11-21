/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0047, row 11): the Split requests queue.
 * GET /api/admin/v1/split-requests → open requests, oldest first. GET .../count → { open }.
 * POST .../{id}/confirm { legs? } and .../{id}/refuse { note? } → { status }; 409 when already answered.
 */

import * as runtime from '../runtime';

export type SplitBoxSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface SplitLegAdmin {
    boxSize: SplitBoxSize;
}

export interface SplitRequestAdminDto {
    id: string;
    deliveryId: string;
    courierId: string;
    courierName: string;
    restaurantName: string | null;
    orderReference: string | null;
    currentBoxSize: string;
    legNumber: number | null;
    legCount: number | null;
    proposedLegs: SplitLegAdmin[];
    createdAt: string;
    waitedMinutes: number;
}

const basePath = '/api/admin/v1/split-requests';

export class SplitRequestApi extends runtime.BaseAPI {
    private async headers(json = false): Promise<runtime.HTTPHeaders> {
        const headers: runtime.HTTPHeaders = json ? { 'Content-Type': 'application/json' } : {};
        if (this.configuration && this.configuration.accessToken) {
            const tokenString = await this.configuration.accessToken('bearer', []);
            if (tokenString) {
                headers['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        return headers;
    }

    async list(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SplitRequestAdminDto[]> {
        const response = await this.request({ path: basePath, method: 'GET', headers: await this.headers() }, initOverrides);
        return await new runtime.JSONApiResponse<SplitRequestAdminDto[]>(response).value();
    }

    async count(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ open: number }> {
        const response = await this.request({ path: `${basePath}/count`, method: 'GET', headers: await this.headers() }, initOverrides);
        return await new runtime.JSONApiResponse<{ open: number }>(response).value();
    }

    // No legs: as the rider proposed. With legs: the boxes the admin changed it to (2 to 4).
    async confirm(id: string, legs?: SplitLegAdmin[], initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ status: string }> {
        const response = await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}/confirm`, method: 'POST', headers: await this.headers(true), body: legs ? { legs } : {} },
            initOverrides
        );
        return await new runtime.JSONApiResponse<{ status: string }>(response).value();
    }

    async refuse(id: string, note?: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ status: string }> {
        const response = await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}/refuse`, method: 'POST', headers: await this.headers(true), body: note ? { note } : {} },
            initOverrides
        );
        return await new runtime.JSONApiResponse<{ status: string }>(response).value();
    }
}
