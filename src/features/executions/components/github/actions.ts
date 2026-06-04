"use server"

import { githubChannel } from "@/inngest/channels/github"
import { inngest } from "@/inngest/client"
import { getSubscriptionToken, Realtime } from "@inngest/realtime"

export type GitHubToken = Realtime.Token<ReturnType<typeof githubChannel>, ["status"]>

export async function fetchGitHubRealtimeToken(): Promise<GitHubToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: githubChannel(),
        topics: ["status"]
    })

    return token
}
