/* tslint:disable */
/* eslint-disable */
// Hand edited (spec 0029), like the rest of this SDK since row 21: not generated yet.

export interface PartnerAvailabilityAdminDto {
    busyExtraMinutes: number | null;
    pausedUntil: Date | null;
    disabledAt: Date | null;
    disabledReason: string | null;
    acceptingOrders: boolean;
    notAcceptingReason: string | null;
}

export function PartnerAvailabilityAdminDtoFromJSON(json: any): PartnerAvailabilityAdminDto {
    return {
        'busyExtraMinutes': json['busyExtraMinutes'] ?? null,
        'pausedUntil': json['pausedUntil'] ? new Date(json['pausedUntil']) : null,
        'disabledAt': json['disabledAt'] ? new Date(json['disabledAt']) : null,
        'disabledReason': json['disabledReason'] ?? null,
        'acceptingOrders': json['acceptingOrders'],
        'notAcceptingReason': json['notAcceptingReason'] ?? null,
    };
}

export interface PartnerAvailabilityChangeAdminDto {
    id: string;
    action: 'BUSY_ON' | 'BUSY_OFF' | 'PAUSED' | 'RESUMED' | 'DISABLED' | 'ENABLED';
    actorRole: string;
    actorEmail: string | null;
    extraMinutes: number | null;
    pausedUntil: Date | null;
    reason: string | null;
    createdAt: Date;
}

export function PartnerAvailabilityChangeAdminDtoFromJSON(json: any): PartnerAvailabilityChangeAdminDto {
    return {
        'id': json['id'],
        'action': json['action'],
        'actorRole': json['actorRole'],
        'actorEmail': json['actorEmail'] ?? null,
        'extraMinutes': json['extraMinutes'] ?? null,
        'pausedUntil': json['pausedUntil'] ? new Date(json['pausedUntil']) : null,
        'reason': json['reason'] ?? null,
        'createdAt': new Date(json['createdAt']),
    };
}
