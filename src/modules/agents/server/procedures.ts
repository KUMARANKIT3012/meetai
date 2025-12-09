import { db } from "@/db";
import { agents } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agentsInsertSchema } from "../schemas";
import { z } from "zod";
import { eq } from "drizzle-orm";



export const agentsRouter = createTRPCRouter({
  // TODO: change 'getOne' to use 'protectedprocedure' 
    getOne: protectedProcedure.input(z.object({id : z.string()})).query(async ({input}) => {
    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, input.id))

    return existingAgent;
  }),

   // TODO: change 'getmany' to use 'protectedprocedure' 
  getMany: protectedProcedure.query(async () => {
    const data = await db
      .select()
      .from(agents);

    return data;
  }),
  // inside the input we will add schema to create 
  // ctx is context which will have user info because we are using protected procedure
  create: protectedProcedure
  .input(agentsInsertSchema)
  .mutation(async ({input, ctx}) => {
    const [createdAgent] = await db
      .insert(agents)
      .values({
        ...input,
        userId: ctx.auth.user.id, // getting user id from context
      })
      .returning(); // returning the created agent

      return createdAgent;
  }),
});

// why do we need to return an array because by default drizzle always returns an array of inserted items
