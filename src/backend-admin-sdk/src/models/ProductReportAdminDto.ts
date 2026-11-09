/* tslint:disable */
/* eslint-disable */
// Hand edited (spec 0032), like the rest of this SDK since row 21.

export interface ProductReportAdminDto {
    id: string;
    deliveryId: string;
    kind: 'WRONG_ITEM' | 'MISSING_ITEM';
    source: 'COURIER' | 'PARTNER' | 'ADMIN';
    reporterEmail: string | null;
    itemName: string | null;
    note: string | null;
    resolvedAt: Date | null;
    resolution: string | null;
    createdAt: Date;
}

export function ProductReportAdminDtoFromJSON(json: any): ProductReportAdminDto {
    return {
        'id': json['id'],
        'deliveryId': json['deliveryId'],
        'kind': json['kind'],
        'source': json['source'],
        'reporterEmail': json['reporterEmail'] ?? null,
        'itemName': json['itemName'] ?? null,
        'note': json['note'] ?? null,
        'resolvedAt': json['resolvedAt'] ? new Date(json['resolvedAt']) : null,
        'resolution': json['resolution'] ?? null,
        'createdAt': new Date(json['createdAt']),
    };
}

export interface ProductReportPageAdminDto {
    data: ProductReportAdminDto[];
    pagination?: any;
}
