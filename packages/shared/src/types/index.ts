import { z } from "zod";

export const taskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  completed: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
