/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0005): the admin's view of one restaurant's saved customers.
 * GET, PATCH and DELETE /api/admin/v1/partners/{partnerId}/customers[/{id}]. No create: customers
 * are saved by their restaurant.
 */

import * as runtime from '../runtime';
import type { SavedCustomerAdminDto, SavedCustomerListAdminDto, SavedCustomerUpdateAdminInput } from '../models/index';
import {
    SavedCustomerAdminDtoFromJSON,
    SavedCustomerListAdminDtoFromJSON,
    SavedCustomerUpdateAdminInputToJSON,
} from '../models/index';

export interface SavedCustomersApiListRequest {
    partnerId: string;
    q?: string;
    page?: number;
    perPage?: number;
}

export interface SavedCustomersApiUpdateRequest {
    partnerId: string;
    id: string;
    input: SavedCustomerUpdateAdminInput;
}

export interface SavedCustomersApiDeleteRequest {
    partnerId: string;
    id: string;
}

const customersPath = (partnerId: string) =>
    `/api/admin/v1/partners/${encodeURIComponent(partnerId)}/customers`;

export class SavedCustomersApi extends runtime.BaseAPI {
    private async authHeaders(): Promise<runtime.HTTPHeaders> {
        const headers: runtime.HTTPHeaders = {};
        if (this.configuration && this.configuration.accessToken) {
            const tokenString = await this.configuration.accessToken('bearer', []);
            if (tokenString) {
                headers['Authorization'] = `Bearer ${tokenString}`;
            }
        }
        return headers;
    }

    async listCustomers(requestParameters: SavedCustomersApiListRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SavedCustomerListAdminDto> {
        const queryParameters: any = {};
        if (requestParameters.q !== undefined) queryParameters['q'] = requestParameters.q;
        if (requestParameters.page !== undefined) queryParameters['page'] = requestParameters.page;
        if (requestParameters.perPage !== undefined) queryParameters['perPage'] = requestParameters.perPage;
        const response = await this.request({
            path: customersPath(requestParameters.partnerId),
            method: 'GET',
            headers: await this.authHeaders(),
            query: queryParameters,
        }, initOverrides);
        return await new runtime.JSONApiResponse(response, (jsonValue) => SavedCustomerListAdminDtoFromJSON(jsonValue)).value();
    }

    async updateCustomer(requestParameters: SavedCustomersApiUpdateRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SavedCustomerAdminDto> {
        const headers = await this.authHeaders();
        headers['Content-Type'] = 'application/json';
        const response = await this.request({
            path: `${customersPath(requestParameters.partnerId)}/${encodeURIComponent(requestParameters.id)}`,
            method: 'PATCH',
            headers,
            query: {},
            body: SavedCustomerUpdateAdminInputToJSON(requestParameters.input),
        }, initOverrides);
        // The backend answers { customer }.
        return await new runtime.JSONApiResponse(response, (jsonValue) => SavedCustomerAdminDtoFromJSON(jsonValue['customer'])).value();
    }

    async deleteCustomer(requestParameters: SavedCustomersApiDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.request({
            path: `${customersPath(requestParameters.partnerId)}/${encodeURIComponent(requestParameters.id)}`,
            method: 'DELETE',
            headers: await this.authHeaders(),
            query: {},
        }, initOverrides);
    }
}
