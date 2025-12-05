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
        from: `"MyApp" <${process.env.SMTP_FROM}>`,
        to,
        subject: "Your Verification Code",
        html: `
            <h2>Verify your email</h2>
            <p>Your verification code is:</p>
            <div style="
                font-size: 32px; 
                letter-spacing: 6px; 
                font-weight: bold; 
                padding: 10px 0;
            ">
                ${code}
            </div>
            <p>This code will expire in <strong>30 minutes</strong>.</p>
        `,
    };

    try {
        await transporter.sendMail(message);
    } catch (err) {
        throw new Error("Could not send verification email");
    }
}
