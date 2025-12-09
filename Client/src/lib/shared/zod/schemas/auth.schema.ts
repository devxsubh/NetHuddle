import { z } from "zod";

const passwordValidation = z
  .string({ required_error: "Password is required" })
  .min(8, "Password cannot be shorter than 8 characters")
  .max(40, "Password cannot be longer than 30 characters")
  .regex(
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm,
    "Password must contain 8 characters, 1 uppercase letter, 1 lowercase letter and 1 number"
  );

const emailValidation = z
  .string({ required_error: "Email is required" })
  .regex(
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g,
    "Please enter a valid email"
  );

// Updated to match backend validators
const signupSchema = z
  .object({
    firstName: z
      .string({ required_error: "First name is required" })
      .min(2, "First name cannot be shorter than 2 characters")
      .max(66, "First name cannot be longer than 66 characters")
      .trim(),
    lastName: z
      .string({ required_error: "Last name is required" })
      .min(2, "Last name cannot be shorter than 2 characters")
      .max(66, "Last name cannot be longer than 66 characters")
      .trim(),
    userName: z
      .string({ required_error: "Username is required" })
      .regex(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric")
      .min(6, "Username cannot be shorter than 6 characters")
      .max(66, "Username cannot be longer than 66 characters"),
    email: emailValidation,
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords doesn't match",
    path: ["confirmPassword"],
  });

// Updated to match backend: uses userName instead of email
const loginSchema = z.object({
  userName: z.string({ required_error: "Username is required" }),
  password: z
    .string()
    .min(6, "Password cannot be shorter than 6 characters")
    .max(666, "Password cannot be longer than 666 characters"),
});

const forgotPasswordSchema = z.object({
  email: emailValidation,
});

const resetPasswordSchema = z
  .object({
    newPassword: passwordValidation,
    confirmPassword: z.string({
      required_error: "Confirm password is required",
    }),
  })
  .refine(
    ({ newPassword, confirmPassword }) => newPassword === confirmPassword,
    { message: "Passwords dosen't match", path: ["confirmPassword"] }
  );

const otpVerificationSchema = z.object({
  otp: z
    .string({ required_error: "Otp is required" })
    .min(4, { message: "OTP must be a minimum of 4 digits" }),
});

const keyRecoverySchema = z.object({
  password: passwordValidation,
});

export {
  forgotPasswordSchema, keyRecoverySchema, loginSchema, otpVerificationSchema, resetPasswordSchema, signupSchema
};

export type signupSchemaType = z.infer<typeof signupSchema>;
export type loginSchemaType = z.infer<typeof loginSchema>;
export type forgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type otpVerificationSchemaType = z.infer<typeof otpVerificationSchema>;
export type keyRecoverySchemaType = z.infer<typeof keyRecoverySchema>;
