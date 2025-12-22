import crypto from "crypto";

const rawKey = process.env.PENDING_ENCRYPTION_KEY;

if (!rawKey) {
    throw new Error("Missing env variable PENDING_ENCRYPTION_KEY");
}

const rawSalt = process.env.CODE_SALT;

if (!rawSalt) {
    throw new Error("Missing env variable CODE_SALT");
}

// Tell TypeScript: this is now guaranteed to be a string
export const codeSalt: number = Number(rawSalt);

// Convert key to Buffer. Must be 32 bytes.
const key = Buffer.from(rawKey, "utf8");
if (key.length !== 32) {
    throw new Error("PENDING_ENCRYPTION_KEY must be 32 bytes for AES-256-GCM, given key of length=" + key.length);
}

export function encrypt(text: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
        encrypted: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64")
    };
}

export function decrypt(payload: {
    encrypted: string;
    iv: string;
    tag: string;
}) {
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(payload.iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.encrypted, "base64")),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}
