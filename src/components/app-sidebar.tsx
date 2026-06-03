"use client"
import {
    CreditCardIcon,
    FolderOpenIcon,
    HistoryIcon,
    KeyIcon,
    LogOutIcon,
    StarIcon

} from "lucide-react"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
    Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent
    , SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem
} from "./ui/sidebar"
import { url } from "inspector"
import { group } from "console"
import { Item } from "@radix-ui/react-accordion"


import { authClient } from "@/lib/auth-client"
import { useHasActiveSubscription } from "@/features/auth/components/subscriptions/hooks/use-subscription"



const menuItems = [
    {
        title: "Main",
        items: [
            {
                title: "workflows",
                icon: FolderOpenIcon,
                url: "/workflows",


            },
            {
                title: "Credentials",
                icon: KeyIcon,
                url: "/credentials",


            },
            {
                title: "Executions",
                icon: HistoryIcon,
                url: "/executions",


            }
        ]
    },
]


export const AppSidebar = () => {
    const {hasActiveSubscription, isLoading} = useHasActiveSubscription()
    const router = useRouter()
    const pathname = usePathname()
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                        <Link href="/" prefetch>
                            <Image src="/logos/logo.svg" alt="Nodebase" width={30} height={30} />
                            <span className="font-semibold text-sm "> Nodebase</span>
                        </Link>

                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarHeader>
            <SidebarContent>
                {menuItems.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((Item) => (
                                    <SidebarMenuItem key={Item.title}>
                                        <SidebarMenuButton
                                            tooltip={Item.title}
                                            isActive={
                                                Item.url === "/"
                                                    ? pathname === "/"
                                                    : pathname.startsWith(Item.url)
                                            }
                                            asChild
                                            className="gap-x-4 h-10 px-4"
                                        >

                                            <Link href={Item.url} prefetch>
                                                <Item.icon className="size-4" />
                                                <span>{Item.title}  </span>
                                            </Link>


                                        </SidebarMenuButton>

                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
               
                <SidebarMenu>
                     {!hasActiveSubscription && !isLoading && (
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Upgrade Plan"
                            className="gap-x-4 h-10 px-4"
                            onClick={() => router.push("/pricing")}
                        >
                            <StarIcon className="h-4 w-4" />
                            <span>
                                Upgrade Plan
                            </span>


                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    )}

                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Billing"
                            className="gap-x-4 h-10 px-4"
                            onClick={() => router.push("/pricing")}
                        >
                            <CreditCardIcon className="h-4 w-4" />
                            <span>
                                Billing
                            </span>


                        </SidebarMenuButton>
                    </SidebarMenuItem>


                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sign out"
                            className="gap-x-4 h-10 px-4"
                            onClick={() => authClient.signOut({
                                fetchOptions: {
                                    onSuccess: () => {
                                        router.push("/login")
                                    },
                                },
                            })}
                        >
                            <LogOutIcon className="h-4 w-4" />
                            <span>
                                Sign Out
                            </span>


                        </SidebarMenuButton>
                    </SidebarMenuItem>

                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}