export interface TransportRoute {
    id?: string;
    name: string;
    driver_name: string;
    vehicle_info: string;
    daily_fee: number;
    created_at?: string;
}

export interface BusAssignment {
    id?: string;
    student_id: string;
    route_id: string;
    pick_up: string;
    drop_off: string;
    created_at?: string;
}

export interface MealPlan {
    id?: string;
    name: string;
    description: string;
    term_fee: number;
    created_at?: string;
}

export interface CanteenSubscription {
    id?: string;
    student_id: string;
    meal_plan_id: string;
    term: string;
    is_active: boolean;
    created_at?: string;
}

export interface BusLocation {
    id?: string;
    route_id: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
}
