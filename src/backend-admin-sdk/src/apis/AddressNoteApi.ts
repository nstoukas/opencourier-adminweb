/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0053, row 82): riders' notes about places.
 * GET /api/admin/v1/address-notes/flagged (flagged notes, newest flag first),
 * GET /api/admin/v1/address-notes?search=&page=&perPage= (by address text or coordinates, newest
 * confirmed first), DELETE /{id} (204, recorded with who and when; the text is not kept; 404 when
 * unknown), POST /{id}/dismiss-flags (204). The author is shown here only, for abuse.
 */

import * as runtime from '../runtime';

export interface AddressNoteFlagAdminDto {
    id: string;
    reason: string | null;
    createdAt: string;
}

export interface AddressNoteAdminDto {
    id: string;
    note: string;
    latitude: number;
    longitude: number;
    // The linked Location's address, null for a note with only a point.
    address: string | null;
    actor: string;
    authorCourierId: string | null;
    authorName: string | null;
    // Upvotes from riders other than the author.
    upvotes: number;
    flags: AddressNoteFlagAdminDto[];
    createdAt: string;
    updatedAt: string;
    lastConfirmedAt: string;
}

export interface AddressNoteSearchAdminDto {
    data: AddressNoteAdminDto[];
    total: number;
    page: number;
    perPage: number;
}

const basePath = '/api/admin/v1/address-notes';

export class AddressNoteApi extends runtime.BaseAPI {
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

    async flagged(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<AddressNoteAdminDto[]> {
        const response = await this.request({ path: `${basePath}/flagged`, method: 'GET', headers: await this.authHeaders() }, initOverrides);
        return await new runtime.JSONApiResponse<AddressNoteAdminDto[]>(response).value();
    }

    async search(
        params: { search?: string; page?: number; perPage?: number },
        initOverrides?: RequestInit | runtime.InitOverrideFunction
    ): Promise<AddressNoteSearchAdminDto> {
        const query: runtime.HTTPQuery = {};
        if (params.search) query['search'] = params.search;
        if (params.page !== undefined) query['page'] = params.page;
        if (params.perPage !== undefined) query['perPage'] = params.perPage;
        const response = await this.request(
            { path: basePath, method: 'GET', headers: await this.authHeaders(), query },
            initOverrides
        );
        return await new runtime.JSONApiResponse<AddressNoteSearchAdminDto>(response).value();
    }

    async remove(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}`, method: 'DELETE', headers: await this.authHeaders() },
            initOverrides
        );
    }

    async dismissFlags(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}/dismiss-flags`, method: 'POST', headers: await this.authHeaders(true), body: {} },
            initOverrides
        );
    }
}
