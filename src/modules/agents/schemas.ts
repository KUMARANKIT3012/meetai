import {z} from "zod"; // import zod library for schema validation

export const agentsInsertSchema = z.object({ // define schema for inserting an agent
  name: z.string().min(1, {message: "Name is required"}),
  instructions: z.string().min(1, {message: "Instructions are required"}),
})

