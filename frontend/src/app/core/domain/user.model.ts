export enum Role {
    ECOPOWER_ADMIN = 'ECOPOWER_ADMIN',
    IT_ADMIN = 'IT_ADMIN',
    ADMIN = 'ADMIN',
    HEADMASTER = 'HEADMASTER',
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
    GUARDIAN = 'GUARDIAN',
    LIBRARIAN = 'LIBRARIAN',
    ACCOUNTANT = 'ACCOUNTANT',
    BURSAR = 'BURSAR',
    HR_MANAGER = 'HR_MANAGER',
    LOGISTICS_MANAGER = 'LOGISTICS_MANAGER',
    OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
    CLERK = 'CLERK',
    NURSE = 'NURSE'
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: Role;
    permissions?: string[];
}
