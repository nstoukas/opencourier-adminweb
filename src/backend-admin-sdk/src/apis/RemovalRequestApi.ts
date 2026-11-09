/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0035, row 24): a rider's request to come off an order, and the co-op's list of
 * reasons. POST /api/admin/v1/removal-requests/{id}/approve and /decline,
 * GET /api/admin/v1/deliveries/{id}/removal-requests, and GET, POST, PATCH /{id}, DELETE /{id} on
 * /api/admin/v1/removal-reasons. Times arrive as ISO strings (UTC).
 */

import * as runtime from '../runtime';

export interface RemovalReasonAdminDto {
    id: string;
    label: string;
    paidToRider: boolean;
    chargedToRestaurant: boolean;
    needsNote: boolean;
    // Smallest first in the rider's list. Only an edit sets it; a new reason goes last.
    position: number;
    removedAt: string | null;
}

export interface RemovalReasonCreateAdminInput {
    label: string;
    paidToRider: boolean;
    chargedToRestaurant: boolean;
    needsNote: boolean;
}

// `extends Partial<...>` takes every field of the create input, each one optional, and adds `position`.
export interface RemovalReasonUpdateAdminInput extends Partial<RemovalReasonCreateAdminInput> {
    position?: number;
}

export interface RemovalRequestAdminDto {
    id: string;
    courierId: string;
    courierName: string;
    // The reason as it read when the rider sent the request: a later edit never changes it.
    label: string;
    paidToRider: boolean;
    chargedToRestaurant: boolean;
    note: string | null;
    // Plain `string`, as on DeliveryIssueAdminDto. Shown through REMOVAL_REQUEST_STATUS_TO_HUMAN.
    status: string;         // 'OPEN' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN' | 'CLOSED'
    createdAt: string;
    decidedAt: string | null;
    // Null also when the admin who decided has since been deleted, so never assume it follows decidedAt.
    decidedBy: { id: string; email: string | null; username: string | null } | null;
    decisionNote: string | null;
    payAmount: number | null;
    payPolicy: string | null;
    afterPickup: boolean;
    settledAt: string | null;
}

export interface RemovalApproveAdminResponse {
    status: string;
    deliveryStatus: string;
}

const requestsPath = '/api/admin/v1/removal-requests';
const reasonsPath = '/api/admin/v1/removal-reasons';

export class RemovalRequestApi extends runtime.BaseAPI {
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

    // `pickedUp` is what the admin saw on the board: the server refuses it if the order has moved on.
    async approve(id: string, pickedUp: boolean, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RemovalApproveAdminResponse> {
        const response = await this.request({ path: `${requestsPath}/${encodeURIComponent(id)}/approve`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: { pickedUp } }, initOverrides);
        return await new runtime.JSONApiResponse<RemovalApproveAdminResponse>(response).value();
    }

    async decline(id: string, note: string | undefined, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ status: string }> {
        const response = await this.request({ path: `${requestsPath}/${encodeURIComponent(id)}/decline`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: note === undefined ? {} : { note } }, initOverrides);
        return await new runtime.JSONApiResponse<{ status: string }>(response).value();
    }

    async listForDelivery(deliveryId: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RemovalRequestAdminDto[]> {
        const response = await this.request({ path: `/api/admin/v1/deliveries/${encodeURIComponent(deliveryId)}/removal-requests`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<RemovalRequestAdminDto[]>(response).value();
    }

    async listReasons(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RemovalReasonAdminDto[]> {
        const response = await this.request({ path: reasonsPath, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<RemovalReasonAdminDto[]>(response).value();
    }

    async createReason(input: RemovalReasonCreateAdminInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RemovalReasonAdminDto> {
        const response = await this.request({ path: reasonsPath, method: 'POST', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<RemovalReasonAdminDto>(response).value();
    }

    async updateReason(id: string, input: RemovalReasonUpdateAdminInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RemovalReasonAdminDto> {
        const response = await this.request({ path: `${reasonsPath}/${encodeURIComponent(id)}`, method: 'PATCH', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<RemovalReasonAdminDto>(response).value();
    }

    async removeReason(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RemovalReasonAdminDto> {
        const response = await this.request({ path: `${reasonsPath}/${encodeURIComponent(id)}`, method: 'DELETE', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<RemovalReasonAdminDto>(response).value();
    }
}
