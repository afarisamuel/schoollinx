export enum Role {
    ECOPOWER_ADMIN = 'ECOPOWER_ADMIN',
    IT_ADMIN = 'IT_ADMIN',
    ADMIN = 'ADMIN',
    HEADMASTER = 'HEADMASTER',
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
    GUARDIAN = 'GUARDIAN',
    LIBRARIAN = 'LIBRARIAN',
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: Role;
}
