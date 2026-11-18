/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0036, row 109): what each restaurant owes, and bills admins make by hand.
 * GET /api/admin/v1/partner-charges/months/{month} (?partnerId=), GET .../months/{month}/partners/{partnerId},
 * POST /api/admin/v1/partner-bills, POST /partner-bills/{id}/undo, GET /partner-bills/{id}/statement.
 * Amounts are integer cents. A month is YYYY-MM, the Athens calendar month a charge was written in.
 */

import * as runtime from '../runtime';

export type PartnerChargeReason = 'CANCELLATION' | 'WAITING' | 'REMOVAL';

// One charge as the statement shows it. Nothing about the customer.
export interface PartnerChargeLineDto {
    id: string;
    // When the charge was written: decides its month.
    createdAt: string;
    // When the cancellation, the wait or the removal happened: shown on the line.
    happenedAt: string;
    reason: PartnerChargeReason;
    waitMinutes: number | null;
    removalLabel: string | null;
    amount: number;
    currencyCode: string;
    deliveryId: string;
    orderReference: string | null;
}

// A line on the admin pages also names the open bill that covers it, if any.
export interface PartnerChargeBilledLineDto extends PartnerChargeLineDto {
    billId: string | null;
    bill: { id: string; reference: string | null; createdAt: string } | null;
}

export interface PartnerChargeOverviewLineDto extends PartnerChargeBilledLineDto {
    partnerId: string;
    partnerName: string;
}

// One per currency: amounts in different currencies are never added together.
export interface PartnerChargeTotalsDto {
    currencyCode: string;
    charged: number;
    billed: number;
    unbilled: number;
}

export interface AmountTotalDto {
    currencyCode: string;
    amount: number;
}

export interface PartnerBillDto {
    id: string;
    month: string;
    reference: string | null;
    createdAt: string;
    billedByLabel: string;
    lineCount: number;
    totals: AmountTotalDto[];
    undoneAt: string | null;
    undoneByLabel: string | null;
    undoReason: string | null;
    chargeIds: string[];
}

export interface PartnerChargeMonthDto {
    month: string;
    restaurants: { partnerId: string; partnerName: string; count: number; totals: PartnerChargeTotalsDto[] }[];
    charges: PartnerChargeOverviewLineDto[];
    // Earlier months that still hold unbilled charges, oldest first.
    earlierUnbilled: { month: string; count: number }[];
}

export interface PartnerChargePartnerMonthDto {
    partner: { id: string; name: string };
    month: string;
    charges: PartnerChargeBilledLineDto[];
    // Newest first, undone ones included.
    bills: PartnerBillDto[];
    totals: PartnerChargeTotalsDto[];
}

export interface PartnerBillStatementDto {
    partner: { name: string; pickupAddress: string | null };
    month: string;
    bill: PartnerBillDto;
    lines: PartnerChargeLineDto[];
    totals: AmountTotalDto[];
}

export interface PartnerBillCreateInput {
    partnerId: string;
    month: string;
    chargeIds: string[];
    reference?: string;
}

export class PartnerChargeApi extends runtime.BaseAPI {
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

    async month(month: string, partnerId?: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PartnerChargeMonthDto> {
        const query: runtime.HTTPQuery = partnerId ? { partnerId } : {};
        const response = await this.request({ path: `/api/admin/v1/partner-charges/months/${encodeURIComponent(month)}`, method: 'GET', headers: await this.authHeaders(), query }, initOverrides);
        return await new runtime.JSONApiResponse<PartnerChargeMonthDto>(response).value();
    }

    async partnerMonth(month: string, partnerId: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PartnerChargePartnerMonthDto> {
        const response = await this.request({ path: `/api/admin/v1/partner-charges/months/${encodeURIComponent(month)}/partners/${encodeURIComponent(partnerId)}`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<PartnerChargePartnerMonthDto>(response).value();
    }

    async createBill(input: PartnerBillCreateInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PartnerBillDto> {
        const response = await this.request({ path: '/api/admin/v1/partner-bills', method: 'POST', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<PartnerBillDto>(response).value();
    }

    async undoBill(id: string, reason: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PartnerBillDto> {
        const response = await this.request({ path: `/api/admin/v1/partner-bills/${encodeURIComponent(id)}/undo`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: { reason } }, initOverrides);
        return await new runtime.JSONApiResponse<PartnerBillDto>(response).value();
    }

    async statement(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PartnerBillStatementDto> {
        const response = await this.request({ path: `/api/admin/v1/partner-bills/${encodeURIComponent(id)}/statement`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<PartnerBillStatementDto>(response).value();
    }
}
