/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0034, chat): dispatch's shared inbox. Times arrive as ISO strings (UTC).
 * Nothing here can say whether a rider or restaurant read a message: the server keeps no such record (AC-6).
 */

import * as runtime from '../runtime';
import type { CourierAdminDtoStatusEnum } from '../models/CourierAdminDto';
import type { DeliveryAdminDtoStatusEnum } from '../models/DeliveryAdminDto';
import type { PaginationDto } from '../models/PaginationDto';

export type ChatSenderKind = 'DISPATCH' | 'COURIER' | 'PARTNER' | 'SYSTEM';
export type ChatPartyKind = 'COURIER' | 'PARTNER';
export type ChatTab = 'UNREAD' | 'COURIERS' | 'RESTAURANTS' | 'ALL';

export interface ChatMessageAdminDto {
    id: string;
    threadId: string;
    senderKind: ChatSenderKind;
    // The colleague (username, else email) for DISPATCH, the rider or restaurant for theirs, null for SYSTEM.
    senderName: string | null;
    body: string;
    deliveryId: string | null;
    orderReference: string | null;
    // The id the sender's screen made for this message (AC-19), so a screen can match its own pending copy.
    // `?` because an older backend leaves it out; null for a message sent without one.
    clientMessageId?: string | null;
    createdAt: string;
}

export interface ChatThreadRowAdminDto {
    id: string;
    kind: ChatPartyKind;
    courierId: string | null;
    partnerId: string | null;
    name: string;
    lastMessageAt: string | null;
    lastMessage: ChatMessageAdminDto | null;
    linkedDeliveryId: string | null;
    linkedOrderReference: string | null;
    unread: boolean;
}

export interface ChatThreadsAdminDto {
    data: ChatThreadRowAdminDto[];
    pagination: PaginationDto;
}

export interface ChatActiveDeliveryAdminDto {
    id: string;
    orderReference: string | null;
    status: DeliveryAdminDtoStatusEnum;
}

export interface ChatThreadAdminDto {
    id: string;
    kind: ChatPartyKind;
    courierId: string | null;
    partnerId: string | null;
    name: string;
    phoneNumber: string | null;
    courierStatus: CourierAdminDtoStatusEnum | null;
    activeDeliveries: ChatActiveDeliveryAdminDto[];
    moreActiveDeliveries: number;
    quickReplies: string[];
    // Spec 0054 AC-7 (decision 47.26): each preset in both languages, so the composer can show the
    // reader's current one. Optional: an older backend sends only `quickReplies`.
    quickReplyPresets?: { el: string; en: string }[];
    dispatchLastReadAt: string | null;
}

export interface ChatSendAdminInput {
    body: string;
    deliveryId?: string | null;
    clientMessageId: string;
}

export interface ChatThreadsQuery {
    tab: ChatTab;
    search?: string;
    page?: number;
}

const threadsPath = '/api/admin/v1/chat/threads';

export class ChatApi extends runtime.BaseAPI {
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

    async listThreads(query: ChatThreadsQuery, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ChatThreadsAdminDto> {
        const params: runtime.HTTPQuery = { tab: query.tab };
        if (query.search) params['search'] = query.search;
        if (query.page) params['page'] = query.page;
        const response = await this.request({ path: threadsPath, method: 'GET', headers: await this.authHeaders(), query: params }, initOverrides);
        return await new runtime.JSONApiResponse<ChatThreadsAdminDto>(response).value();
    }

    async unreadCount(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ count: number }> {
        const response = await this.request({ path: `${threadsPath}/unread-count`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<{ count: number }>(response).value();
    }

    // AC-15: a rider's or restaurant's Message button. Exactly one of the two ids.
    async openThread(party: { courierId: string } | { partnerId: string }, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ChatThreadAdminDto> {
        const response = await this.request({ path: threadsPath, method: 'POST', headers: await this.authHeaders(true), query: {}, body: party }, initOverrides);
        return await new runtime.JSONApiResponse<ChatThreadAdminDto>(response).value();
    }

    async getThread(threadId: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ChatThreadAdminDto> {
        const response = await this.request({ path: `${threadsPath}/${encodeURIComponent(threadId)}`, method: 'GET', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<ChatThreadAdminDto>(response).value();
    }

    async listMessages(threadId: string, page: { before?: string; after?: string } = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ChatMessageAdminDto[]> {
        const params: runtime.HTTPQuery = {};
        if (page.before) params['before'] = page.before;
        if (page.after) params['after'] = page.after;
        const response = await this.request({ path: `${threadsPath}/${encodeURIComponent(threadId)}/messages`, method: 'GET', headers: await this.authHeaders(), query: params }, initOverrides);
        return await new runtime.JSONApiResponse<ChatMessageAdminDto[]>(response).value();
    }

    async sendMessage(threadId: string, input: ChatSendAdminInput, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ChatMessageAdminDto> {
        const response = await this.request({ path: `${threadsPath}/${encodeURIComponent(threadId)}/messages`, method: 'POST', headers: await this.authHeaders(true), query: {}, body: input }, initOverrides);
        return await new runtime.JSONApiResponse<ChatMessageAdminDto>(response).value();
    }

    async markRead(threadId: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ dispatchLastReadAt: string | null }> {
        const response = await this.request({ path: `${threadsPath}/${encodeURIComponent(threadId)}/read`, method: 'POST', headers: await this.authHeaders(), query: {} }, initOverrides);
        return await new runtime.JSONApiResponse<{ dispatchLastReadAt: string | null }>(response).value();
    }
}
