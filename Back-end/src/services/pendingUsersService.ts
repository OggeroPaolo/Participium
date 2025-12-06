
interface PendingUser {
    hashedCode: string;
    encryptedPassword: { 
        encrypted: string;
        iv: string;
        tag: string;
    };
    userData: {
        firstName: string;
        lastName: string;
        username: string;
        email: string;
    };
    expiresAt: number;
}

// key = email
const pendingUsers: Map<string, PendingUser> = new Map(); 

export const savePendingUser = (email: string, data: PendingUser) => {
    pendingUsers.set(email, data);
};

export const getPendingUser = (email: string): PendingUser | undefined => {
    return pendingUsers.get(email);
};

export const removePendingUser = (email: string) => {
    pendingUsers.delete(email);
};

export const updateCode = (email: string, newHashedCode: string) => {
    const user = pendingUsers.get(email);
    if (!user) throw new Error();
    user.hashedCode = newHashedCode;
    user.expiresAt = Date.now() + 30 * 60 * 1000;
};