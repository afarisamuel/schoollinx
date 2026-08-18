export enum Role {
    ECOPOWER_ADMIN = 'ECOPOWER_ADMIN',
    ADMIN = 'ADMIN',
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
