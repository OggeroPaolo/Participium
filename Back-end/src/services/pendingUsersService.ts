
interface PendingUser {
    hashedCode: string;
    userData: {
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        password: string;
    };
    expiresAt: number;
}

// key = email
const pendingUsers: Map<string, PendingUser> = new Map(); 

export const savePendingUser = async (email: string, data: PendingUser) => {
    pendingUsers.set(email, data);
};

export const getPendingUser = (email: string): PendingUser | undefined => {
    return pendingUsers.get(email);
};

export const removePendingUser = (email: string) => {
    pendingUsers.delete(email);
};
