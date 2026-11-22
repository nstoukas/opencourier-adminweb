/* tslint:disable */
/* eslint-disable */

import * as runtime from '../runtime';

// Spec 0052 (row 83): complaints both ways, with no ratings. Hand written, like the rest of this SDK.
// The list's only filters are status and about: the backend takes no rider id, so nothing here can
// list, count or sort a rider's complaints (cross check 13, binding value 5).

export type ComplaintStatus = 'OPEN' | 'AWAITING_REPLY' | 'DECIDED' | 'WITHDRAWN';
export type ComplaintAbout = 'RESTAURANT' | 'CUSTOMER' | 'RIDER';
export type ComplaintFiledBy = 'RIDER' | 'RESTAURANT' | 'ADMIN';
export type ComplaintCategory =
    | 'LONG_WAIT'
    | 'FOOD_NOT_READY'
    | 'UNSAFE_PACKAGING'
    | 'RUDE_STAFF'
    | 'ABUSE_OR_THREAT'
    | 'UNSAFE_ADDRESS'
    | 'NOT_ANSWERING'
    | 'LATE'
    | 'RUDE'
    | 'FOOD_DAMAGED'
    | 'OTHER';

// The job a complaint is on: enough to recognise it, nothing about the customer.
export interface ComplaintDeliverySummaryDto {
    id: string;
    // The restaurant's name.
    pickupName: string;
    createdAt: string;
}

// Admins see everything, with every name (AC-6).
export interface ComplaintAdminDto {
    id: string;
    delivery: ComplaintDeliverySummaryDto;
    filedBy: ComplaintFiledBy;
    // The rider, restaurant or admin who filed it (null if that admin user was deleted).
    filerName: string | null;
    filerCourierId: string | null;
    filerPartnerId: string | null;
    about: ComplaintAbout;
    aboutCourierId: string | null;
    aboutCourierName: string | null;
    // Only then may an admin enter the rider's reply for them (cross check 2).
    aboutCourierDeactivated: boolean;
    category: ComplaintCategory;
    text: string;
    status: ComplaintStatus;
    createdAt: string;
    riderReply: string | null;
    repliedAt: string | null;
    // The admin who typed a deactivated rider's reply, or null when the rider replied in the app.
    replyEnteredBy: string | null;
    outcome: string | null;
    decidedAt: string | null;
    decidedBy: string | null;
    withdrawnReason: string | null;
    withdrawnAt: string | null;
    withdrawnBy: string | null;
}

export interface ComplaintPagination {
    perPage: number;
    totalItems: number;
    totalPages: number;
    currentItems: number;
    currentPage: number;
    prevPage: number | null;
    nextPage: number | null;
}

export interface ComplaintAdminPageDto {
    data: ComplaintAdminDto[];
    pagination?: ComplaintPagination;
}

// A rider who accepted a delivery, to pick one when filing on a reassigned job (cross check 3).
export interface ComplaintDeliveryRiderDto {
    id: string;
    name: string;
}

export interface ComplaintCreateAdminInput {
    deliveryId: string;
    // One of LATE, RUDE, FOOD_DAMAGED, OTHER.
    category: ComplaintCategory;
    // Names who called in.
    text: string;
    // Needed only when more than one rider accepted the delivery.
    aboutCourierId?: string | null;
}

export interface ComplaintListAdminArgs {
    status?: ComplaintStatus;
    about?: ComplaintAbout;
    page: number;
    perPage: number;
}

export class ComplaintApi extends runtime.BaseAPI {
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

    async list(args: ComplaintListAdminArgs, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintAdminPageDto> {
        // A filter left out is not sent at all: the runtime would send the word "undefined".
        const query: runtime.HTTPQuery = { page: args.page, perPage: args.perPage };
        if (args.status) query.status = args.status;
        if (args.about) query.about = args.about;
        const response = await this.request({ path: '/api/admin/v1/complaints', method: 'GET', headers: await this.authHeaders(), query }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintAdminPageDto>(response).value();
    }

    async get(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintAdminDto> {
        const response = await this.request({ path: `/api/admin/v1/complaints/${encodeURIComponent(id)}`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintAdminDto>(response).value();
    }

    async deliveryRiders(deliveryId: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintDeliveryRiderDto[]> {
        const response = await this.request({ path: `/api/admin/v1/complaints/delivery-riders/${encodeURIComponent(deliveryId)}`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintDeliveryRiderDto[]>(response).value();
    }

    async file(input: ComplaintCreateAdminInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintAdminDto> {
        const response = await this.request({ path: '/api/admin/v1/complaints', method: 'POST', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintAdminDto>(response).value();
    }

    async decide(id: string, outcome: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintAdminDto> {
        const response = await this.request({ path: `/api/admin/v1/complaints/${encodeURIComponent(id)}/decide`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: { outcome } }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintAdminDto>(response).value();
    }

    async withdraw(id: string, reason: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintAdminDto> {
        const response = await this.request({ path: `/api/admin/v1/complaints/${encodeURIComponent(id)}/withdraw`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: { reason } }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintAdminDto>(response).value();
    }

    async replyForRider(id: string, text: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ComplaintAdminDto> {
        const response = await this.request({ path: `/api/admin/v1/complaints/${encodeURIComponent(id)}/reply-for-rider`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: { text } }, initOverrides);
        return await new runtime.JSONApiResponse<ComplaintAdminDto>(response).value();
    }
}
