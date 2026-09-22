import { z } from "zod";
export const prioritySchema=z.enum(["URGENT","HIGH","MEDIUM","LOW"]);
export const createTaskSchema=z.object({title:z.string().trim().min(3).max(120),description:z.string().max(5000).default(""),location:z.string().max(200).optional().nullable(),priority:prioritySchema.default("MEDIUM"),deadline:z.string().datetime().optional().nullable(),categoryId:z.string().cuid().optional().nullable()});
export const transitionSchema=z.object({action:z.enum(["claim","unclaim","start","pause","block","unblock","complete","reopen"]),reason:z.string().min(1).max(2000).optional(),actualMinutes:z.number().int().min(0).max(4800).optional(),note:z.string().max(2000).optional()});
export const estimateSchema=z.object({minutes:z.number().int().min(5).max(480)});
export const commentSchema=z.object({body:z.string().trim().min(1).max(2000)});
