export type CampaignStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';

export interface Campaign {
    id?: string;
    subject: string;
    body_html: string;
    status?: CampaignStatus;
    target: string; // e.g. "ALL_PARENTS", "GRADE_10", "ALUMNI"
    creator_id?: string;
    created_at?: string;
    updated_at?: string;
}
