import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email and password are required"),
  password: z.string().min(1, "Email and password are required"),
});
export type LoginInput = z.infer<typeof loginSchema>;