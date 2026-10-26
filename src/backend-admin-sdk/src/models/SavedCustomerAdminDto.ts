/* tslint:disable */
/* eslint-disable */
/**
 * Hand edited (spec 0005): a restaurant's saved customer, as the admin routes
 * /api/admin/v1/partners/{partnerId}/customers send it, and the admin's edit.
 * This SDK has no generator; keep the FromJSON and ToJSON functions in step with the fields.
 */

import { exists } from '../runtime';

export interface SavedCustomerAdminDto {
    id: string;
    name: string;
    // E.164, e.g. +306912345678
    phone: string;
    notes: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    zipCode: string | null;
    latitude: number;
    longitude: number;
    formattedAddress: string | null;
    // ISO text, as the backend sends dates
    lastUsedAt: string;
    createdAt: string;
    updatedAt: string;
}

export function SavedCustomerAdminDtoFromJSON(json: any): SavedCustomerAdminDto {
    return {
        id: json['id'],
        name: json['name'],
        phone: json['phone'],
        notes: !exists(json, 'notes') ? null : json['notes'],
        addressLine1: json['addressLine1'],
        addressLine2: !exists(json, 'addressLine2') ? null : json['addressLine2'],
        city: json['city'],
        zipCode: !exists(json, 'zipCode') ? null : json['zipCode'],
        latitude: json['latitude'],
        longitude: json['longitude'],
        formattedAddress: !exists(json, 'formattedAddress') ? null : json['formattedAddress'],
        lastUsedAt: json['lastUsedAt'],
        createdAt: json['createdAt'],
        updatedAt: json['updatedAt'],
    };
}

export interface SavedCustomerListAdminDto {
    items: SavedCustomerAdminDto[];
    // How many match the search (all of them without one)
    total: number;
}

export function SavedCustomerListAdminDtoFromJSON(json: any): SavedCustomerListAdminDto {
    return {
        items: (json['items'] ?? []).map(SavedCustomerAdminDtoFromJSON),
        total: json['total'] ?? 0,
    };
}

// What an admin may change (operator's pick, spec 0005 adminweb design): never the address.
export interface SavedCustomerUpdateAdminInput {
    name?: string;
    phone?: string;
    addressLine2?: string | null;
    notes?: string | null;
}

export function SavedCustomerUpdateAdminInputToJSON(value?: SavedCustomerUpdateAdminInput | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        name: value.name,
        phone: value.phone,
        addressLine2: value.addressLine2,
        notes: value.notes,
    };
}
