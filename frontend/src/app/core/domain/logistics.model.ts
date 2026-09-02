import { Student } from './student.model';

export interface RouteStop {
    id?: string;
    route_id: string;
    name: string;
    order: number;
    status?: string;
    time?: string;
    created_at?: string;
}

export interface TransportRoute {
    id?: string;
    name: string;
    driver_name?: string;
    driver_phone?: string;
    vehicle_info?: string;
    vehicle_plate?: string;
    capacity?: number;
    is_active?: boolean;
    daily_fee?: number;
    current_lat?: number;
    current_lng?: number;
    speed_kmh?: number;
    heading_deg?: number;
    next_stop_name?: string;
    estimated_arrival_mins?: number;
    last_ping_at?: string;
    stops?: RouteStop[];
    created_at?: string;
}

export interface BusAssignment {
    id?: string;
    student_id: string;
    student?: Student;
    route_id: string;
    pick_up?: string;
    drop_off?: string;
    created_at?: string;
}

export interface MealPlan {
    id?: string;
    name: string;
    description?: string;
    term_fee?: number;
    created_at?: string;
}

export interface CanteenSubscription {
    id?: string;
    student_id: string;
    student?: Student;
    meal_plan_id: string;
    term: string;
    is_active?: boolean;
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
