import { initTRPC , TRPCError} from '@trpc/server';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import superjson from 'superjson';
import prisma from '@/lib/db';

export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return {
    auth: session ?? null,
    userId: session?.user?.id ?? null,
  }
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if(!ctx.auth){
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not authorized to perform this action',
    })
  }

  return next( {
    ctx:{ ...ctx, auth: ctx.auth }
  });
});
export const premiumProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: { plan: true, planStatus: true },
    })

    if (!user || user.plan === 'FREE' || user.planStatus !== 'active') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Active subscription required. Upgrade your plan at /pricing',
      })
    }

    return next({
      ctx: {
        ...ctx,
        userPlan: user.plan,
      }
    })
  }
)