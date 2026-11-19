/* tslint:disable */
/* eslint-disable */

import * as runtime from '../runtime';

// Spec 0038: a rider asks a person to review a decision the app took about their work, and the
// record of every settings change. Hand written, like the rest of this SDK.

export type ReviewTopic = 'OFFER' | 'PAY' | 'OTHER';
export type ReviewRequestStatus = 'OPEN' | 'ANSWERED' | 'WITHDRAWN';
export type ReviewOutcome = 'STANDS' | 'CHANGED';

// The delivery a request is about: enough to recognise it, nothing about the customer.
export interface ReviewDeliverySummaryDto {
    id: string;
    // The restaurant's name.
    pickupName: string;
    createdAt: string;
}

export interface ReviewRequestAdminDto {
    id: string;
    topic: ReviewTopic;
    // The rider's words.
    note: string;
    status: ReviewRequestStatus;
    createdAt: string;
    dueAt: string;
    // Open and past dueAt, worked out by the server at read time.
    overdue: boolean;
    outcome: ReviewOutcome | null;
    answer: string | null;
    answeredAt: string | null;
    withdrawnAt: string | null;
    // The pay correction the answer added, in cents, or null.
    correctionCents: number | null;
    delivery: ReviewDeliverySummaryDto | null;
    courierId: string;
    courierName: string;
    // The answering admin's login, or null while unanswered.
    answeredBy: string | null;
}

export interface ReviewPagination {
    perPage: number;
    totalItems: number;
    totalPages: number;
    currentItems: number;
    currentPage: number;
    prevPage: number | null;
    nextPage: number | null;
}

export interface ReviewRequestAdminPageDto {
    data: ReviewRequestAdminDto[];
    pagination?: ReviewPagination;
}

export interface ReviewRequestCountDto {
    open: number;
    overdue: number;
}

export interface ReviewRequestAnswerInput {
    outcome: ReviewOutcome;
    answer: string;
    // Whole cents above 0 and at most the co-op's cap; only with CHANGED on a delivery's request.
    correctionCents?: number;
}

// One line of the Change history: a setting's value before and after, and who saved it.
export interface SettingChangeAdminDto {
    id: string;
    at: string;
    key: string;
    label: string;
    // The removal reason's or shift slot's id; null for a setting.
    subject: string | null;
    oldValue: unknown;
    newValue: unknown;
    changedBy: string | null;
}

export interface SettingChangeAdminPageDto {
    data: SettingChangeAdminDto[];
    pagination?: ReviewPagination;
    // When the first change was recorded, or null while none is.
    recordedSince: string | null;
}

export class ReviewRequestApi extends runtime.BaseAPI {
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

    async list(status: ReviewRequestStatus, page: number, perPage: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ReviewRequestAdminPageDto> {
        const response = await this.request({ path: '/api/admin/v1/review-requests', method: 'GET', headers: await this.authHeaders(), query: { status, page, perPage } }, initOverrides);
        return await new runtime.JSONApiResponse<ReviewRequestAdminPageDto>(response).value();
    }

    async count(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ReviewRequestCountDto> {
        const response = await this.request({ path: '/api/admin/v1/review-requests/count', method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ReviewRequestCountDto>(response).value();
    }

    async get(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ReviewRequestAdminDto> {
        const response = await this.request({ path: `/api/admin/v1/review-requests/${encodeURIComponent(id)}`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ReviewRequestAdminDto>(response).value();
    }

    async answer(id: string, input: ReviewRequestAnswerInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ReviewRequestAdminDto> {
        const response = await this.request({ path: `/api/admin/v1/review-requests/${encodeURIComponent(id)}/answer`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<ReviewRequestAdminDto>(response).value();
    }

    async settingChanges(page: number, perPage: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SettingChangeAdminPageDto> {
        const response = await this.request({ path: '/api/admin/v1/setting-changes', method: 'GET', headers: await this.authHeaders(), query: { page, perPage } }, initOverrides);
        return await new runtime.JSONApiResponse<SettingChangeAdminPageDto>(response).value();
    }
}
