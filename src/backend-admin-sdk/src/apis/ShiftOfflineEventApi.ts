/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0049, row 79): Offline during a booked shift, for an admin to follow up in person.
 * GET /api/admin/v1/shifts/offline-events (open items, and followed up ones for 7 days, newest first),
 * POST /{id}/followed-up (204; 409 when already followed up; 404 when unknown). Times also come as
 * Athens text. Never grouped, counted or sorted by rider.
 */

import * as runtime from '../runtime';

export interface ShiftOfflineEventAdminDto {
    id: string;
    courierId: string;
    courierName: string;
    offlineAt: string | null;
    // "21:10", Athens.
    offlineTime: string | null;
    shiftDate: string;
    // "Fri 20 Nov, 20:00 to 23:59", Athens, always English: the page words the shift itself from the two
    // times below (row 124) and shows this only when they are missing (an older backend).
    shiftText: string;
    // The booked shift's start and end, ISO (row 124). Optional: an older backend does not send them.
    shiftStartsAt?: string;
    shiftEndsAt?: string;
    // RIDER, ADMIN, CUT_OFF, LAST_CALL_ACCEPTED or SYSTEM_START.
    cause: string | null;
    causeText: string;
    followedUpAt: string | null;
    followedUpByEmail: string | null;
}

const basePath = '/api/admin/v1/shifts/offline-events';

export class ShiftOfflineEventApi extends runtime.BaseAPI {
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

    async list(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ShiftOfflineEventAdminDto[]> {
        const response = await this.request({ path: basePath, method: 'GET', headers: await this.authHeaders() }, initOverrides);
        return await new runtime.JSONApiResponse<ShiftOfflineEventAdminDto[]>(response).value();
    }

    async followUp(id: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.request(
            { path: `${basePath}/${encodeURIComponent(id)}/followed-up`, method: 'POST', headers: await this.authHeaders(true), body: {} },
            initOverrides
        );
    }
}
