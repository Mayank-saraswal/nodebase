import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export const useSubscription = () => {
  const trpc = useTRPC()
  return useQuery(
    trpc.billing.getStatus.queryOptions()
  )
}

export const useHasActiveSubscription = () => {
  const { data: billingStatus, isLoading, ...rest } = useSubscription();
  const hasActiveSubscription =
    !!billingStatus && billingStatus.plan !== "FREE" && billingStatus.planStatus === "active";

  return {
    hasActiveSubscription,
    plan: billingStatus?.plan ?? "FREE",
    isLoading,
    ...rest,
  }
}