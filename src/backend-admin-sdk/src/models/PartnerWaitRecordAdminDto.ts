/* tslint:disable */
/* eslint-disable */
// Hand edited (spec 0030), like the rest of this SDK since row 21.

export interface PartnerWaitRecordAdminDto {
    days: number;
    orderCount: number;
    waitSamples: number;
    averageWaitMinutes: number | null;
    lateShare: number | null;
    prepSamples: number;
    medianPrepMinutes: number | null;
    usualPrepMinutes: number;
}

export function PartnerWaitRecordAdminDtoFromJSON(json: any): PartnerWaitRecordAdminDto {
    return {
        'days': json['days'],
        'orderCount': json['orderCount'],
        'waitSamples': json['waitSamples'],
        'averageWaitMinutes': json['averageWaitMinutes'] ?? null,
        'lateShare': json['lateShare'] ?? null,
        'prepSamples': json['prepSamples'],
        'medianPrepMinutes': json['medianPrepMinutes'] ?? null,
        'usualPrepMinutes': json['usualPrepMinutes'],
    };
}
