import {z} from "zod"; // import zod library for schema validation

export const meetingsInsertSchema = z.object({ // define schema for inserting an agent
  name: z.string().min(1, {message: "Name is required"}),
  agentId: z.string().min(1, {message: "Agent ID is required"}),
})

export const meetingsUpdateSchema = meetingsInsertSchema.extend({
  id: z.string().min(1, { message: "Id is required" }),
});