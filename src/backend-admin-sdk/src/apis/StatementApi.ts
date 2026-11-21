/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0050, row 76): a rider's monthly statements for an admin.
 * GET /api/admin/v1/courier/{id}/statements → { months, downloads } (months newest first; downloads by admins,
 * newest first). GET /{id}/statements/{month}?format=pdf|csv&lang=el|en streams the file; each download is
 * recorded on the server and shown to the rider.
 */

import * as runtime from '../runtime';

export interface StatementDownloadAdminDto {
    id: string;
    month: string;
    format: string;
    createdAt: string;
    adminEmail: string | null;
}

export interface CourierStatementsAdminDto {
    months: string[];
    downloads: StatementDownloadAdminDto[];
}

export type StatementFormat = 'pdf' | 'csv';
export type StatementLang = 'el' | 'en';

const basePath = (id: string) => `/api/admin/v1/courier/${encodeURIComponent(id)}/statements`;

export class StatementApi extends runtime.BaseAPI {
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

    async list(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CourierStatementsAdminDto> {
        const response = await this.request({ path: basePath(id), method: 'GET', headers: await this.authHeaders() }, initOverrides);
        return await new runtime.JSONApiResponse<CourierStatementsAdminDto>(response).value();
    }

    // The file's bytes; the caller saves it.
    async download(
        id: string,
        month: string,
        format: StatementFormat,
        lang: StatementLang,
        initOverrides?: RequestInit | runtime.InitOverrideFunction
    ): Promise<Blob> {
        const response = await this.request(
            {
                path: `${basePath(id)}/${encodeURIComponent(month)}`,
                method: 'GET',
                headers: await this.authHeaders(),
                query: { format, lang },
            },
            initOverrides
        );
        return await response.blob();
    }
}
