import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";

import {
  sendVerificationEmail,
  resendVerificationEmail,
} from "../../../src/services/emailService.js";

// --- Mock nodemailer ---
vi.mock("nodemailer", () => {
  const sendMail = vi.fn();

  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail,
      })),
      __mockSendMail: sendMail,
    },
  };
});

const mockSendMail = (nodemailer as any).__mockSendMail;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Email Service", () => {
  it("should send verification email successfully", async () => {
    await sendVerificationEmail("test@example.com", "123456");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Your Verification Code",
        html: expect.stringContaining("123456"),
      })
    );
  });

  it("should throw error when verification email fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP broken"));

    await expect(
      sendVerificationEmail("fail@example.com", "999999")
    ).rejects.toThrow("Could not send verification email");
  });

  it("should send resend verification email successfully", async () => {
    await resendVerificationEmail("test2@example.com", "654321");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test2@example.com",
        subject: "Your New Verification Code",
        html: expect.stringContaining("654321"),
      })
    );
  });

  it("should throw error when resend verification email fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP broken"));

    await expect(
      resendVerificationEmail("fail2@example.com", "111111")
    ).rejects.toThrow("Could not send the verification email");
  });
});
