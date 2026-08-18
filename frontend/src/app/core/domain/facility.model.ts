export interface InventoryItem {
    id?: string;
    name: string;
    asset_tag?: string;
    category: string;
    quantity: number;
    reorder_threshold?: number;
    unit_value: number;
    acquisition_date?: string;
    depreciation_rate?: number;
    current_value?: number;
    location: string;
    status?: 'ACTIVE' | 'DISPOSED' | 'MAINTENANCE';
    last_updated?: string;
    created_at?: string;
}

export interface VisitorLog {
    id?: string;
    name: string;
    phone: string;
    purpose: string;
    host_id?: string;
    check_in?: string;
    check_out?: string;
    created_at?: string;
}

export interface Room {
    id: string;
    name: string;
    capacity: number;
    type: string;
    created_at?: string;
}

export interface RoomBooking {
    id: string;
    room_id: string;
    room?: Room;
    booker_id: string;
    purpose: string;
    start_time: string;
    end_time: string;
    created_at?: string;
}
