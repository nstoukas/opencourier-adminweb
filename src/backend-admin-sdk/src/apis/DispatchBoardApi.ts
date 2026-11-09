/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0034): the Dispatch board. GET /api/admin/v1/dispatch/board, asked every 10 s.
 * Times arrive as ISO strings (UTC).
 */

import * as runtime from '../runtime';
import type { DeliveryAdminDtoStatusEnum } from '../models/DeliveryAdminDto';

export interface DispatchBoardCardsDto {
    active: { total: number; toPickup: number; toDropoff: number };
    waiting: { total: number; oldestWaitingMinutes: number | null };
    couriers: { total: number; busy: number; free: number; lastCall: number };
    deliveredToday: { total: number; medianMinutes: number | null };
}

export interface DispatchAttentionRowDto {
    id: string;
    // Plain string: rows 24 and 111 add kinds, and an older tab draws them as a plain row.
    kind: string;
    // Null: show no minutes (an offer with its deadline running, spec 0034 AC-5).
    since: string | null;
    deliveryId: string | null;
    sosId: string | null;
    issueId: string | null;
    threadId: string | null;
    status: DeliveryAdminDtoStatusEnum | null;
    courierId: string | null;
    orderReference: string | null;
    restaurantName: string | null;
    riderName: string | null;
    customerLabel: string | null;
    // The sentence the row reads. A report's note follows on a second line.
    detail: string;
    held: boolean;
}

export interface DispatchMapCourierDto {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    state: 'FREE' | 'BUSY';
    carrying: { deliveryId: string; orderReference: string | null; offered: boolean }[];
}

export interface DispatchMapWaitingDeliveryDto {
    deliveryId: string;
    orderReference: string | null;
    latitude: number;
    longitude: number;
}

export interface DispatchMapDto {
    couriers: DispatchMapCourierDto[];
    waitingDeliveries: DispatchMapWaitingDeliveryDto[];
}

export interface DispatchBoardDto {
    generatedAt: string;
    cards: DispatchBoardCardsDto;
    attention: DispatchAttentionRowDto[];
    attentionMore: number;
    map: DispatchMapDto;
    dispatchStop: { active: boolean; until: string | null };
}

export class DispatchBoardApi extends runtime.BaseAPI {
    async getBoard(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<DispatchBoardDto> {
        const headers: runtime.HTTPHeaders = {};
        if (this.configuration && this.configuration.accessToken) {
            const tokenString = await this.configuration.accessToken('bearer', []);
            if (tokenString) {
                headers['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({ path: '/api/admin/v1/dispatch/board', method: 'GET', headers, query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<DispatchBoardDto>(response).value();
    }
}
