import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // false for port 587, true for port 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

// Sends a verification email to the user
export async function sendVerificationEmail(to: string, code: string) {
    const message = {
        from: `"Participium" <${process.env.SMTP_FROM}>`,
        to,
        subject: "Your Verification Code",
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 480px; margin: auto;">
            <h2 style="color:#4A4A4A; text-align:center;">Verify Your Email</h2>
            <p style="font-size: 15px;">
                Thanks for signing up for <strong>Participium</strong>!  
                Please use the verification code below to confirm your email address.
            </p>

            <div style="
                background: #f4f4f4;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                text-align: center;
            ">
                <span style="
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #2b2b2b;
                ">
                    ${code}
                </span>
            </div>

            <p style="font-size: 15px;">
                This code will expire in <strong>30 minutes</strong>.
            </p>

            <p style="margin-top: 32px; font-size: 13px; color: #888; text-align:center;">
                – The Participium Team
            </p>
        </div>
        `,
    };

    try {
        await transporter.sendMail(message);
    } catch (err) {
        throw new Error("Could not send verification email");
    }
}


export async function resendVerificationEmail(to: string, code: string) {
    const message = {
        from: `"Participium" <${process.env.SMTP_FROM}>`,
        to,
        subject: "Your New Verification Code",
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 480px; margin: auto;">
            <h2 style="color:#4A4A4A; text-align:center;">Your New Verification Code</h2>
            <p style="font-size: 15px;">
                You requested a new verification code for your <strong>Participium</strong> account.  
                Use the updated code below to continue.
            </p>

            <div style="
                background: #f4f4f4;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                text-align: center;
            ">
                <span style="
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #2b2b2b;
                ">
                    ${code}
                </span>
            </div>

            <p style="font-size: 15px;">
                This code will expire in <strong>30 minutes</strong> — your previous one is not valid anymore.  
            </p>

            <p style="margin-top: 32px; font-size: 13px; color: #888; text-align:center;">
                – The Participium Team
            </p>
        </div>
        `,
    };

    try {
        await transporter.sendMail(message);
    } catch (err) {
        throw new Error("Could not send the verification email");
    }
}
