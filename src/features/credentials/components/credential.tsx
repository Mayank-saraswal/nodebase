"use client"

import { CredentialType } from "@/generated/prisma";
import { useParams, useRouter, usePathname } from "next/navigation";
import z from "zod";
import { useCreateCredential, useUpdateCredential, useUpdateCredentialName, useSuspennseCredential } from "../hooks/use-credentials";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { GoogleConnectButton } from "@/components/google-connect-button";
import { GithubConnectButton } from "@/components/github-connect-button";


const formSchema = z.object({
    name: z.string().min(1, "Name is Required"),
    type: z.enum(CredentialType),
    value: z.string().min(1, "Api key  is required"),
    gmailEmail: z.string().optional(),
    gmailAppPassword: z.string().optional(),
    whatsappAccessToken: z.string().optional(),
    whatsappPhoneNumberId: z.string().optional(),
    notionApiKey: z.string().optional(),
    razorpayKeyId: z.string().optional(),
    razorpayKeySecret: z.string().optional(),
    msg91AuthKey: z.string().optional(),
    shiprocketEmail: z.string().optional(),
    shiprocketPassword: z.string().optional(),
    zohoClientId: z.string().optional(),
    zohoClientSecret: z.string().optional(),
    zohoRefreshToken: z.string().optional(),
    zohoRegion: z.enum(["in", "com", "eu", "au", "jp", "uk"]).optional(),
    slackAuthType: z.enum(["bot_token", "webhook"]).optional(),
    slackBotToken: z.string().optional(),
    slackWebhookUrl: z.string().optional(),
    hubspotAccessToken: z.string().optional(),
    hubspotRefreshToken: z.string().optional(),
    hubspotExpiresAt: z.string().optional(),
    hubspotPortalId: z.string().optional(),
    hubspotHubId: z.string().optional(),
    freshdeskApiKey: z.string().optional(),
    freshdeskDomain: z.string().optional(),
    cashfreeClientId: z.string().optional(),
    cashfreeClientSecret: z.string().optional(),
    cashfreeEnvironment: z.enum(["production", "sandbox"]).optional(),
    cashfreePayoutClientId: z.string().optional(),
    cashfreePayoutClientSecret: z.string().optional(),
    postgresHost: z.string().optional(),
    postgresPort: z.coerce.number().optional(),
    postgresDatabase: z.string().optional(),
    postgresUser: z.string().optional(),
    postgresPassword: z.string().optional(),
    postgresSsl: z.enum(["disable", "require", "verify-full"]).optional(),
    githubAccessToken: z.string().optional(),
    githubBaseUrl: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === CredentialType.GMAIL) {
        // Gmail now uses OAuth2 via GoogleConnectButton — no required form fields
    }
    if (data.type === CredentialType.WHATSAPP) {
        if (!data.whatsappAccessToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Access Token is required",
                path: ["whatsappAccessToken"],
            })
        }
        if (!data.whatsappPhoneNumberId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Phone Number ID is required",
                path: ["whatsappPhoneNumberId"],
            })
        }
    }
    if (data.type === CredentialType.NOTION) {
        if (!data.notionApiKey) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Integration Token is required",
                path: ["notionApiKey"],
            })
        }
    }
    if (data.type === CredentialType.RAZORPAY) {
        if (!data.razorpayKeyId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Key ID is required",
                path: ["razorpayKeyId"],
            })
        }
        if (!data.razorpayKeySecret) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Key Secret is required",
                path: ["razorpayKeySecret"],
            })
        }
    }
    if (data.type === CredentialType.MSG91) {
        if (!data.msg91AuthKey) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Auth Key is required",
                path: ["msg91AuthKey"],
            })
        }
    }
    if (data.type === CredentialType.SHIPROCKET) {
        if (!data.shiprocketEmail) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Email is required",
                path: ["shiprocketEmail"],
            })
        }
        if (!data.shiprocketPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Password is required",
                path: ["shiprocketPassword"],
            })
        }
    }
    if (data.type === CredentialType.ZOHO_CRM) {
        if (!data.zohoClientId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Client ID is required",
                path: ["zohoClientId"],
            })
        }
        if (!data.zohoClientSecret) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Client Secret is required",
                path: ["zohoClientSecret"],
            })
        }
        if (!data.zohoRefreshToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Refresh Token is required",
                path: ["zohoRefreshToken"],
            })
        }
    }
    if (data.type === CredentialType.HUBSPOT) {
        if (!data.hubspotAccessToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Access Token is required",
                path: ["hubspotAccessToken"],
            })
        }
        if (!data.hubspotRefreshToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Refresh Token is required",
                path: ["hubspotRefreshToken"],
            })
        }
    }
    if (data.type === CredentialType.FRESHDESK) {
        if (!data.freshdeskApiKey) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "API Key is required",
                path: ["freshdeskApiKey"],
            })
        }
        if (!data.freshdeskDomain) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Domain is required",
                path: ["freshdeskDomain"],
            })
        }
    }
    if (data.type === CredentialType.CASHFREE) {
        if (!data.cashfreeClientId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Client ID is required",
                path: ["cashfreeClientId"],
            })
        }
        if (!data.cashfreeClientSecret) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Client Secret is required",
                path: ["cashfreeClientSecret"],
            })
        }
        if (!data.cashfreeEnvironment) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Environment is required",
                path: ["cashfreeEnvironment"],
            })
        }
    }
    if (data.type === CredentialType.POSTGRES) {
        if (!data.postgresHost) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Host is required", path: ["postgresHost"] })
        if (!data.postgresPort) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Port is required", path: ["postgresPort"] })
        if (!data.postgresDatabase) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Database is required", path: ["postgresDatabase"] })
        if (!data.postgresUser) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "User is required", path: ["postgresUser"] })
        if (!data.postgresPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password is required", path: ["postgresPassword"] })
    }
    if (data.type === CredentialType.GITHUB || data.type === CredentialType.GITHUB_APP) {
        if (!data.githubAccessToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Access Token is required",
                path: ["githubAccessToken"],
            })
        }
    }
    if (data.type === CredentialType.SLACK) {
        if (data.slackAuthType === "bot_token" && !data.slackBotToken) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Bot Token is required",
                path: ["slackBotToken"],
            })
        }
        if (data.slackAuthType === "webhook" && !data.slackWebhookUrl) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Webhook URL is required",
                path: ["slackWebhookUrl"],
            })
        }
    }
})




type FormValues = z.infer<typeof formSchema>

const credentialTypeOptions = [
    {
        value: CredentialType.OPENAI,
        label: "Open AI",
        logo: "/logos/openai.svg"
    },
    {
        value: CredentialType.ANTHROPIC,
        label: "Anthropic",
        logo: "/logos/anthropic.svg"
    },
    {
        value: CredentialType.GEMINI,
        label: "Gemini",
        logo: "/logos/gemini.svg"
    },
    {
        value: CredentialType.DEEPSEEK,
        label: "Deepseek",
        logo: "/logos/deepseek.svg"
    },
    {
        value: CredentialType.PERPLEXITY,
        label: "Perplexity",
        logo: "/logos/perplexity.svg"
    },
    {
        value: CredentialType.XAI,
        label: "xAI",
        logo: "/logos/xai.svg"
    },
    {
        value: CredentialType.GROQ,
        label: "Groq",
        logo: "/logos/groq.svg"
    },
    {
        value: CredentialType.GMAIL,
        label: "Gmail (Legacy)",
        logo: "/logos/gmail.svg"
    },
    {
        value: CredentialType.GMAIL_OAUTH,
        label: "Gmail OAuth",
        logo: "/logos/gmail.svg"
    },
    {
        value: CredentialType.GOOGLE_SHEETS,
        label: "Google Sheets",
        logo: "/logos/googlesheets.svg"
    },
    {
        value: CredentialType.GOOGLE_DRIVE,
        label: "Google Drive",
        logo: "/logos/google-drive.svg"
    },
    {
        value: CredentialType.WHATSAPP,
        label: "WhatsApp",
        logo: "/logos/whatsapp.svg"
    },
    {
        value: CredentialType.NOTION,
        label: "Notion",
        logo: "/logos/notion.svg"
    },
    {
        value: CredentialType.RAZORPAY,
        label: "Razorpay",
        logo: "/logos/razorpay.svg"
    },
    {
        value: CredentialType.SLACK,
        label: "Slack",
        logo: "/logos/slack.svg"
    },
    {
        value: CredentialType.MSG91,
        label: "MSG91",
        logo: "/logos/msg91.svg"
    },
    {
        value: CredentialType.SHIPROCKET,
        label: "Shiprocket",
        logo: "/logos/shiprocket.svg"
    },
    {
        value: CredentialType.ZOHO_CRM,
        label: "Zoho CRM",
        logo: "/logos/zoho.svg"
    },
    {
        value: CredentialType.HUBSPOT,
        label: "HubSpot",
        logo: "/logos/hubspot.svg"
    },
    {
        value: CredentialType.FRESHDESK,
        label: "Freshdesk",
        logo: "/logos/freshdesk.svg"
    },
    {
        value: CredentialType.CASHFREE,
        label: "Cashfree",
        logo: "/logos/cashfree.svg"
    },
    {
        value: CredentialType.POSTGRES,
        label: "PostgreSQL",
        logo: "/logos/postgres.svg"
    },
    {
        value: CredentialType.GITHUB_APP,
        label: "GitHub App",
        logo: "/logos/github.svg"
    },

]

interface CredentialsFormPage {
    initialData?: {
        id?: string;
        name: string;
        type: CredentialType;
        value?: string;
        connectedEmail?: string;
        isGoogleOAuth?: boolean;
        connectedGithubUsername?: string;
        isGithubOAuth?: boolean;
    }
};


export const CredentialForm = ({ initialData }: CredentialsFormPage) => {
    const router = useRouter();
    const pathname = usePathname();
    const createCredential = useCreateCredential();
    const updateCredential = useUpdateCredential();
    const updateCredentialName = useUpdateCredentialName();
    const { handleError, modal } = useUpgradeModal();

    const isEdit = !!initialData?.id;

    // Parse connected email / refresh token from existing OAuth credential
    const [connectedEmail, setConnectedEmail] = useState<string | undefined>()
    const [existingRefreshToken, setExistingRefreshToken] = useState<string | undefined>()
    const [isJustConnected, setIsJustConnected] = useState(false)

    // GitHub OAuth state
    const [connectedGithubUsername, setConnectedGithubUsername] = useState<string | undefined>()
    const [isGithubOAuth, setIsGithubOAuth] = useState(false)

    useEffect(() => {
        if (initialData?.connectedEmail) {
            setConnectedEmail(initialData.connectedEmail)
        }
        if (initialData?.isGoogleOAuth) {
            setExistingRefreshToken("oauth-connected") // truthy marker, not actual token
        }
        if (initialData?.connectedGithubUsername) {
            setConnectedGithubUsername(initialData.connectedGithubUsername)
        }
        if (initialData?.isGithubOAuth) {
            setIsGithubOAuth(true)
        }
    }, [initialData])

    // Handle google_success / google_error URL params after OAuth callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const successEmail = params.get("google_success")
        if (successEmail) {
            setConnectedEmail(successEmail)
            setIsJustConnected(true) // Mark as connected
            toast.success(`Successfully connected ${successEmail}`)
            window.history.replaceState({}, "", window.location.pathname)
        }
        const googleError = params.get("google_error")
        if (googleError) {
            toast.error(`Google connection failed: ${decodeURIComponent(googleError)}`)
            window.history.replaceState({}, "", window.location.pathname)
        }
        const githubSuccess = params.get("github_success")
        if (githubSuccess) {
            setConnectedGithubUsername(githubSuccess)
            setIsGithubOAuth(true)
            toast.success(`Successfully connected ${githubSuccess}`)
            window.history.replaceState({}, "", window.location.pathname)
        }
        const githubError = params.get("github_error")
        if (githubError) {
            toast.error(`GitHub connection failed: ${decodeURIComponent(githubError)}`)
            window.history.replaceState({}, "", window.location.pathname)
        }
    }, [])

    // Parse WhatsApp JSON value into individual fields for editing
    const whatsappDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.WHATSAPP && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value);
                return {
                    whatsappAccessToken: parsed.accessToken ?? "",
                    whatsappPhoneNumberId: parsed.phoneNumberId ?? "",
                };
            } catch {
                return { whatsappAccessToken: "", whatsappPhoneNumberId: "" };
            }
        }
        return { whatsappAccessToken: "", whatsappPhoneNumberId: "" };
    }, [initialData]);

    const notionDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.NOTION && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return { notionApiKey: parsed.apiKey ?? initialData.value }
            } catch {
                // plain string stored directly
                return { notionApiKey: initialData.value ?? "" }
            }
        }
        return { notionApiKey: "" }
    }, [initialData])

    const razorpayDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.RAZORPAY && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    razorpayKeyId: parsed.keyId ?? "",
                    razorpayKeySecret: parsed.keySecret ?? "",
                }
            } catch {
                return { razorpayKeyId: "", razorpayKeySecret: "" }
            }
        }
        return { razorpayKeyId: "", razorpayKeySecret: "" }
    }, [initialData])

    const msg91Defaults = useMemo(() => {
        if (initialData?.type === CredentialType.MSG91 && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return { msg91AuthKey: parsed.authKey ?? "" }
            } catch {
                return { msg91AuthKey: initialData.value ?? "" }
            }
        }
        return { msg91AuthKey: "" }
    }, [initialData])

    const shiprocketDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.SHIPROCKET && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    shiprocketEmail: parsed.email ?? "",
                    shiprocketPassword: parsed.password ?? "",
                }
            } catch {
                return { shiprocketEmail: "", shiprocketPassword: "" }
            }
        }
        return { shiprocketEmail: "", shiprocketPassword: "" }
    }, [initialData])

    const slackDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.SLACK && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                if (parsed.type === "bot_token") {
                    return {
                        slackAuthType: "bot_token" as const,
                        slackBotToken: parsed.token ?? "",
                        slackWebhookUrl: "",
                    }
                }
                if (parsed.type === "webhook") {
                    return {
                        slackAuthType: "webhook" as const,
                        slackBotToken: "",
                        slackWebhookUrl: parsed.webhookUrl ?? "",
                    }
                }
            } catch {
                // fall through
            }
        }
        return { slackAuthType: "bot_token" as const, slackBotToken: "", slackWebhookUrl: "" }
    }, [initialData])

    const zohoDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.ZOHO_CRM && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    zohoClientId: parsed.clientId ?? "",
                    zohoClientSecret: parsed.clientSecret ?? "",
                    zohoRefreshToken: parsed.refreshToken ?? "",
                    zohoRegion: parsed.region ?? "in",
                }
            } catch {
                return {
                    zohoClientId: "",
                    zohoClientSecret: "",
                    zohoRefreshToken: "",
                    zohoRegion: "in" as const,
                }
            }
        }
        return {
            zohoClientId: "",
            zohoClientSecret: "",
            zohoRefreshToken: "",
            zohoRegion: "in" as const,
        }
    }, [initialData])

    const hubspotDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.HUBSPOT && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    hubspotAccessToken: parsed.accessToken ?? "",
                    hubspotRefreshToken: parsed.refreshToken ?? "",
                    hubspotExpiresAt: parsed.expiresAt ? String(parsed.expiresAt) : "",
                    hubspotPortalId: parsed.portalId ?? "",
                    hubspotHubId: parsed.hubId ?? parsed.portalId ?? "",
                }
            } catch {
                return {
                    hubspotAccessToken: "",
                    hubspotRefreshToken: "",
                    hubspotExpiresAt: "",
                    hubspotPortalId: "",
                    hubspotHubId: "",
                }
            }
        }
        return {
            hubspotAccessToken: "",
            hubspotRefreshToken: "",
            hubspotExpiresAt: "",
            hubspotPortalId: "",
            hubspotHubId: "",
        }
    }, [initialData])

    const freshdeskDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.FRESHDESK && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    freshdeskApiKey: parsed.apiKey ?? "",
                    freshdeskDomain: parsed.domain ?? "",
                }
            } catch {
                return { freshdeskApiKey: "", freshdeskDomain: "" }
            }
        }
        return { freshdeskApiKey: "", freshdeskDomain: "" }
    }, [initialData])

    const cashfreeDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.CASHFREE && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    cashfreeClientId: parsed.clientId ?? "",
                    cashfreeClientSecret: parsed.clientSecret ?? "",
                    cashfreeEnvironment: parsed.environment ?? "sandbox",
                    cashfreePayoutClientId: parsed.payoutClientId ?? "",
                    cashfreePayoutClientSecret: parsed.payoutClientSecret ?? "",
                }
            } catch {
                return { cashfreeClientId: "", cashfreeClientSecret: "", cashfreeEnvironment: "sandbox" as const, cashfreePayoutClientId: "", cashfreePayoutClientSecret: "" }
            }
        }
        return { cashfreeClientId: "", cashfreeClientSecret: "", cashfreeEnvironment: "sandbox" as const, cashfreePayoutClientId: "", cashfreePayoutClientSecret: "" }
    }, [initialData])

    const postgresDefaults = useMemo(() => {
        if (initialData?.type === CredentialType.POSTGRES && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    postgresHost: parsed.host ?? "",
                    postgresPort: parsed.port ?? 5432,
                    postgresDatabase: parsed.database ?? "",
                    postgresUser: parsed.user ?? "",
                    postgresPassword: parsed.password ?? "",
                    postgresSsl: parsed.ssl ?? "disable",
                }
            } catch {
                return { postgresHost: "", postgresPort: 5432, postgresDatabase: "", postgresUser: "", postgresPassword: "", postgresSsl: "disable" }
            }
        }
        return { postgresHost: "", postgresPort: 5432, postgresDatabase: "", postgresUser: "", postgresPassword: "", postgresSsl: "disable" }
    }, [initialData])

    const githubDefaults = useMemo(() => {
        if ((initialData?.type === CredentialType.GITHUB || initialData?.type === CredentialType.GITHUB_APP) && initialData.value) {
            try {
                const parsed = JSON.parse(initialData.value)
                return {
                    githubAccessToken: parsed.accessToken ?? "",
                    githubBaseUrl: parsed.baseUrl ?? "",
                }
            } catch {
                return { githubAccessToken: "", githubBaseUrl: "" }
            }
        }
        return { githubAccessToken: "", githubBaseUrl: "" }
    }, [initialData])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: initialData
            ? { ...initialData, gmailEmail: "", gmailAppPassword: "", ...whatsappDefaults, ...notionDefaults, ...razorpayDefaults, ...msg91Defaults, ...shiprocketDefaults, ...slackDefaults, ...zohoDefaults, ...hubspotDefaults, ...freshdeskDefaults, ...cashfreeDefaults, ...postgresDefaults, ...githubDefaults }
            : {
                name: "",
                type: CredentialType.OPENAI,
                value: "",
                gmailEmail: "",
                gmailAppPassword: "",
                whatsappAccessToken: "",
                whatsappPhoneNumberId: "",
                notionApiKey: "",
                razorpayKeyId: "",
                razorpayKeySecret: "",
                msg91AuthKey: "",
                shiprocketEmail: "",
                shiprocketPassword: "",
                zohoClientId: "",
                zohoClientSecret: "",
                zohoRefreshToken: "",
                zohoRegion: "in",
                slackAuthType: "bot_token",
                slackBotToken: "",
                slackWebhookUrl: "",
                hubspotAccessToken: "",
                hubspotRefreshToken: "",
                hubspotExpiresAt: "",
                hubspotPortalId: "",
                hubspotHubId: "",
                freshdeskApiKey: "",
                freshdeskDomain: "",
                cashfreeClientId: "",
                cashfreeClientSecret: "",
                cashfreeEnvironment: "sandbox",
                cashfreePayoutClientId: "",
                cashfreePayoutClientSecret: "",
                postgresHost: "",
                postgresPort: 5432,
                postgresDatabase: "",
                postgresUser: "",
                postgresPassword: "",
                postgresSsl: "disable",
                githubAccessToken: "",
                githubBaseUrl: "",
            }
    })

    const watchType = form.watch("type")
    const isGmailOAuth = watchType === CredentialType.GMAIL_OAUTH
    const isGmail = watchType === CredentialType.GMAIL || isGmailOAuth
    const isGoogleSheets = watchType === CredentialType.GOOGLE_SHEETS
    const isGoogleDrive = watchType === CredentialType.GOOGLE_DRIVE
    const isGoogleService = isGmail || isGoogleSheets || isGoogleDrive
    const isWhatsApp = watchType === CredentialType.WHATSAPP
    const isNotion = watchType === CredentialType.NOTION
    const isRazorpay = watchType === CredentialType.RAZORPAY
    const isMsg91 = watchType === CredentialType.MSG91
    const isShiprocket = watchType === CredentialType.SHIPROCKET
    const isZohoCrm = watchType === CredentialType.ZOHO_CRM
    const isSlack = watchType === CredentialType.SLACK
    const isHubspot = watchType === CredentialType.HUBSPOT
    const isFreshdesk = watchType === CredentialType.FRESHDESK
    const isCashfree = watchType === CredentialType.CASHFREE
    const isPostgres = watchType === CredentialType.POSTGRES
    const isGithubPAT = watchType === CredentialType.GITHUB
    const isGithubApp = watchType === CredentialType.GITHUB_APP
    const watchSlackAuthType = form.watch("slackAuthType")

    const onSubmit = async (values: FormValues) => {
        let submitValues = { ...values }

        // Google and GitHub OAuth services: credential already saved by callback.
        // Only update the name here.
        if (isGoogleService || isGithubApp) {
            if (isEdit && initialData?.id) {
                try {
                    await updateCredentialName.mutateAsync({
                        id: initialData.id,
                        name: values.name,
                    })
                    toast.success("Credential name updated")
                } catch {
                    // onError in the hook already shows the error toast
                }
            }
            // For new Google credentials, credential was already created by OAuth callback
            return
        }


        // For Gmail, encode email + appPassword as JSON in the value field
        if (values.type === CredentialType.GMAIL) {
            submitValues.value = JSON.stringify({
                email: values.gmailEmail,
                appPassword: values.gmailAppPassword,
            })
        }

        // For WhatsApp, encode accessToken + phoneNumberId as JSON in the value field
        if (values.type === CredentialType.WHATSAPP) {
            submitValues.value = JSON.stringify({
                accessToken: values.whatsappAccessToken,
                phoneNumberId: values.whatsappPhoneNumberId,
            })
        }

        // For Notion, encode apiKey as JSON in the value field
        if (values.type === CredentialType.NOTION) {
            submitValues.value = JSON.stringify({
                apiKey: values.notionApiKey,
            })
        }

        // For Razorpay, encode keyId + keySecret as JSON in the value field
        if (values.type === CredentialType.RAZORPAY) {
            submitValues.value = JSON.stringify({
                keyId: values.razorpayKeyId,
                keySecret: values.razorpayKeySecret,
            })
        }

        // For MSG91, encode authKey as JSON in the value field
        if (values.type === CredentialType.MSG91) {
            submitValues.value = JSON.stringify({
                authKey: values.msg91AuthKey,
            })
        }

        // For Shiprocket, encode email + password as JSON in the value field
        if (values.type === CredentialType.SHIPROCKET) {
            submitValues.value = JSON.stringify({
                email: values.shiprocketEmail,
                password: values.shiprocketPassword,
            })
        }

        if (values.type === CredentialType.ZOHO_CRM) {
            submitValues.value = JSON.stringify({
                clientId: values.zohoClientId,
                clientSecret: values.zohoClientSecret,
                refreshToken: values.zohoRefreshToken,
                region: values.zohoRegion || "in",
            })
        }

        if (values.type === CredentialType.HUBSPOT) {
            submitValues.value = JSON.stringify({
                accessToken: values.hubspotAccessToken,
                refreshToken: values.hubspotRefreshToken,
                expiresAt: values.hubspotExpiresAt ? Number(values.hubspotExpiresAt) : undefined,
                portalId: values.hubspotPortalId,
                hubId: values.hubspotHubId || values.hubspotPortalId,
            })
        }

        // For Freshdesk, encode apiKey + domain as JSON in the value field
        if (values.type === CredentialType.FRESHDESK) {
            submitValues.value = JSON.stringify({
                apiKey: values.freshdeskApiKey,
                domain: values.freshdeskDomain,
            })
        }

        if (values.type === CredentialType.CASHFREE) {
            submitValues.value = JSON.stringify({
                clientId: values.cashfreeClientId,
                clientSecret: values.cashfreeClientSecret,
                environment: values.cashfreeEnvironment || "sandbox",
                payoutClientId: values.cashfreePayoutClientId,
                payoutClientSecret: values.cashfreePayoutClientSecret,
            })
        }

        if (values.type === CredentialType.POSTGRES) {
            submitValues.value = JSON.stringify({
                host: values.postgresHost,
                port: values.postgresPort,
                database: values.postgresDatabase,
                user: values.postgresUser,
                password: values.postgresPassword,
                ssl: values.postgresSsl,
            })
        }

        if (values.type === CredentialType.GITHUB) {
            submitValues.value = JSON.stringify({
                accessToken: values.githubAccessToken,
                baseUrl: values.githubBaseUrl,
            })
        }

        // For Slack, encode based on auth type
        if (values.type === CredentialType.SLACK) {
            if (values.slackAuthType === "bot_token") {
                submitValues.value = JSON.stringify({
                    type: "bot_token",
                    token: values.slackBotToken,
                })
            } else {
                submitValues.value = JSON.stringify({
                    type: "webhook",
                    webhookUrl: values.slackWebhookUrl,
                })
            }
        }

        const { gmailEmail, gmailAppPassword, whatsappAccessToken, whatsappPhoneNumberId, notionApiKey, razorpayKeyId, razorpayKeySecret, msg91AuthKey, shiprocketEmail, shiprocketPassword, zohoClientId, zohoClientSecret, zohoRefreshToken, zohoRegion, slackAuthType, slackBotToken, slackWebhookUrl, hubspotAccessToken, hubspotRefreshToken, hubspotExpiresAt, hubspotPortalId, hubspotHubId, freshdeskApiKey, freshdeskDomain, cashfreeClientId, cashfreeClientSecret, cashfreeEnvironment, cashfreePayoutClientId, cashfreePayoutClientSecret, postgresHost, postgresPort, postgresDatabase, postgresUser, postgresPassword, postgresSsl, githubAccessToken, githubBaseUrl, ...payload } = submitValues

        if (isEdit && initialData?.id) {
            await updateCredential.mutate({
                id: initialData.id,

                ...payload
            })
        } else {
            await createCredential.mutate(payload, {
                onSuccess: (data) => {
                    router.push(`/credentials/${data.id}`)
                },
                onError: (error) => {
                    handleError(error);
                }

            })
        }
    }

    return (
        <>
            {modal}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {isEdit ? "Edit Credential" : "Create Credential"}
                    </CardTitle>
                    <CardDescription>
                        {isEdit ? "Update your api key or credentials" : "Add a new api key or credentials to your account"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="MY Api key" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}


                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>

                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val)
                                                // Set a placeholder value for Gmail/WhatsApp so validation passes
                                                if (val === CredentialType.GMAIL) {
                                                    form.setValue("value", "gmail-credential")
                                                } else if (val === CredentialType.GMAIL_OAUTH) {
                                                    form.setValue("value", "gmail-oauth-credential")
                                                } else if (val === CredentialType.WHATSAPP) {
                                                    form.setValue("value", "whatsapp-credential")
                                                } else if (val === CredentialType.NOTION) {
                                                    form.setValue("value", "notion-credential")
                                                } else if (val === CredentialType.RAZORPAY) {
                                                    form.setValue("value", "razorpay-credential")
                                                } else if (val === CredentialType.MSG91) {
                                                    form.setValue("value", "msg91-credential")
                                                } else if (val === CredentialType.SHIPROCKET) {
                                                    form.setValue("value", "shiprocket-credential")
                                                } else if (val === CredentialType.HUBSPOT) {
                                                    form.setValue("value", "hubspot-credential")
                                                } else if (val === CredentialType.ZOHO_CRM) {
                                                    form.setValue("value", "zoho-crm-credential")
                                                } else if (val === CredentialType.SLACK) {
                                                    form.setValue("value", "slack-credential")
                                                } else if (val === CredentialType.FRESHDESK) {
                                                    form.setValue("value", "freshdesk-credential")
                                                } else if (val === CredentialType.CASHFREE) {
                                                    form.setValue("value", "cashfree-credential")
                                                } else if (val === CredentialType.GOOGLE_SHEETS || val === CredentialType.GOOGLE_DRIVE) {
                                                    form.setValue("value", "google-oauth-credential")
                                                } else {
                                                    const currentValue = form.getValues("value")
                                                    if (
                                                      currentValue === "gmail-credential" ||
                                                      currentValue === "gmail-oauth-credential" ||
                                                      currentValue === "whatsapp-credential" ||
                                                      currentValue === "notion-credential" ||
                                                      currentValue === "razorpay-credential" ||
                                                       currentValue === "msg91-credential" ||
                                                       currentValue === "shiprocket-credential" ||
                                                       currentValue === "hubspot-credential" ||
                                                       currentValue === "zoho-crm-credential" ||
                                                       currentValue === "slack-credential" ||
                                                       currentValue === "freshdesk-credential" ||
                                                       currentValue === "cashfree-credential" ||
                                                       currentValue === "postgres-credential" ||
                                                      currentValue.startsWith("{")
                                                    ) {
                                                      form.setValue("value", "")
                                                    }
                                                }
                                                if (val === CredentialType.POSTGRES) {
                                                    form.setValue("value", "postgres-credential")
                                                }
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {credentialTypeOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        <div className="flex items-center gap-2">
                                                            <Image src={option.logo} alt={option.label} width={16} height={16} />
                                                            <span>{option.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>



                                        </Select>
                                        <FormMessage />



                                    </FormItem>
                                )}


                            />

                            {isGmail ? (
                                <>
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-1">Connect your Gmail account via OAuth2</p>
                                        <p>You will be redirected to Google to approve access. The credential is saved automatically after connecting.</p>
                                    </div>
                                    <GoogleConnectButton
                                        credentialName={form.watch("name")}
                                        credentialType={watchType === CredentialType.GMAIL_OAUTH ? "GMAIL_OAUTH" : "GMAIL"}
                                        returnUrl={`/credentials/${isEdit && initialData?.id ? initialData.id : "new"}`}
                                        isConnected={!!existingRefreshToken || isJustConnected}
                                        connectedEmail={connectedEmail}
                                    />
                                </>
                            ) : isGoogleSheets ? (
                                <>
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-1">Connect your Google Sheets account via OAuth2</p>
                                        <p>You will be redirected to Google to approve access. The credential is saved automatically after connecting.</p>
                                    </div>
                                    <GoogleConnectButton
                                        credentialName={form.watch("name")}
                                        credentialType="GOOGLE_SHEETS"
                                        returnUrl={`/credentials/${isEdit && initialData?.id ? initialData.id : "new"}`}
                                        isConnected={!!existingRefreshToken || isJustConnected}
                                        connectedEmail={connectedEmail}
                                    />
                                </>
                            ) : isGoogleDrive ? (
                                <>
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-1">Connect your Google Drive account via OAuth2</p>
                                        <p>You will be redirected to Google to approve access. The credential is saved automatically after connecting.</p>
                                    </div>
                                    <GoogleConnectButton
                                        credentialName={form.watch("name")}
                                        credentialType="GOOGLE_DRIVE"
                                        returnUrl={`/credentials/${isEdit && initialData?.id ? initialData.id : "new"}`}
                                        isConnected={!!existingRefreshToken || isJustConnected}
                                        connectedEmail={connectedEmail}
                                    />
                                </>
                            ) : isWhatsApp ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="whatsappAccessToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Access Token</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="EAABx... (from Meta Developer Console)" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Find this in Meta for Developers → WhatsApp → API Setup
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="whatsappPhoneNumberId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number ID</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="1234567890" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Find this in Meta for Developers → WhatsApp → API Setup
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">ℹ️ How to get WhatsApp credentials</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Go to{" "}
                                                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">
                                                    developers.facebook.com
                                                </a>
                                            </li>
                                            <li>Create or open your WhatsApp app</li>
                                            <li>Go to WhatsApp → API Setup</li>
                                            <li>Copy the &quot;Temporary access token&quot; or generate a permanent token</li>
                                            <li>Copy the &quot;Phone number ID&quot;</li>
                                        </ol>
                                    </div>
                                </>
                            ) : isNotion ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="notionApiKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Internal Integration Token</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="secret_..." {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Find this in{" "}
                                                    <a
                                                        href="https://www.notion.so/my-integrations"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary underline"
                                                    >
                                                        notion.so/my-integrations
                                                    </a>
                                                    {" "}→ select your integration → Secrets → Internal Integration Secret
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : isRazorpay ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="razorpayKeyId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Key ID</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="rzp_live_xxx or rzp_test_xxx" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="razorpayKeySecret"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Key Secret</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Key Secret" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">ℹ️ How to get Razorpay API Keys</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Go to{" "}
                                                <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="underline">
                                                    dashboard.razorpay.com
                                                </a>
                                            </li>
                                            <li>Settings → API Keys → Generate Key</li>
                                            <li>Copy Key ID and Key Secret</li>
                                        </ol>
                                        <p className="mt-2 text-xs">
                                            Use rzp_test_ keys for testing, rzp_live_ for production
                                        </p>
                                    </div>
                                </>
                            ) : isMsg91 ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="msg91AuthKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Auth Key</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Enter your MSG91 Auth Key" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Found in MSG91 Dashboard → API → Auth Key
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">ℹ️ How to get your MSG91 Auth Key</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Go to{" "}
                                                <a href="https://msg91.com" target="_blank" rel="noopener noreferrer" className="underline">
                                                    msg91.com
                                                </a>
                                                {" "}and log in
                                            </li>
                                            <li>Navigate to API → Auth Key</li>
                                            <li>Copy the Auth Key</li>
                                        </ol>
                                    </div>
                                </>
                            ) : isShiprocket ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="shiprocketEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="Enter your Shiprocket email" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    The email you use to log in to Shiprocket
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="shiprocketPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Enter your Shiprocket password" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Your Shiprocket account password
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">ℹ️ How to get your Shiprocket credentials</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Go to{" "}
                                                <a href="https://app.shiprocket.in" target="_blank" rel="noopener noreferrer" className="underline">
                                                    app.shiprocket.in
                                                </a>
                                                {" "}and sign up or log in
                                            </li>
                                            <li>Use the same email and password here</li>
                                            <li>Shiprocket uses JWT auth — credentials are used to generate a token</li>
                                        </ol>
                                    </div>
                                </>
                            ) : isZohoCrm ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="zohoClientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Client ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Zoho OAuth Client ID" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="zohoClientSecret"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Client Secret</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Zoho OAuth Client Secret" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="zohoRefreshToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Refresh Token</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Zoho OAuth Refresh Token" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="zohoRegion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Region</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value ?? "in"}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select region" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="in">India (in)</SelectItem>
                                                        <SelectItem value="com">Global USA (com)</SelectItem>
                                                        <SelectItem value="eu">Europe (eu)</SelectItem>
                                                        <SelectItem value="au">Australia (au)</SelectItem>
                                                        <SelectItem value="jp">Japan (jp)</SelectItem>
                                                        <SelectItem value="uk">United Kingdom (uk)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">How to get your Zoho CRM credentials</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Go to https://api-console.zoho.in (India) or https://api-console.zoho.com (other regions)</li>
                                            <li>Click "ADD CLIENT" → choose "Server-based Applications"</li>
                                            <li>Set Authorized Redirect URI to any valid URL (e.g. https://your-domain.com)</li>
                                            <li>Copy your Client ID and Client Secret</li>
                                            <li>Use scopes: ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.READ</li>
                                            <li>Generate auth URL, authorize, and copy the refresh_token from response</li>
                                        </ol>
                                    </div>
                                </>
                            ) : isHubspot ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="hubspotAccessToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Access Token</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="HubSpot OAuth access token" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="hubspotRefreshToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Refresh Token</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="HubSpot OAuth refresh token" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="hubspotExpiresAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expires At (ms since epoch)</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="e.g. 1735689600000" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Optional — used to auto-refresh when the token is near expiry.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="hubspotPortalId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Portal ID</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="HubSpot portal ID" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="hubspotHubId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Hub ID (optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="Hub ID (defaults to portal ID)" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">ℹ️ HubSpot OAuth tokens</p>
                                        <p>Use your HubSpot app to generate access and refresh tokens. Tokens are encrypted and refreshed automatically when close to expiry.</p>
                                    </div>
                                </>
                            ) : isFreshdesk ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="freshdeskApiKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>API Key</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Your Freshdesk API Key" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Found in Freshdesk → Profile → Your API Key
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="freshdeskDomain"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Domain</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="yourcompany (from yourcompany.freshdesk.com)" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    The subdomain part of your Freshdesk URL
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-2">ℹ️ How to get your Freshdesk credentials</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Log in to{" "}
                                                <a href="https://freshdesk.com" target="_blank" rel="noopener noreferrer" className="underline">
                                                    freshdesk.com
                                                </a>
                                            </li>
                                            <li>Click your profile icon → Profile Settings</li>
                                            <li>Your API Key is on the right side panel</li>
                                            <li>Your domain is the &quot;yourcompany&quot; part of yourcompany.freshdesk.com</li>
                                        </ol>
                                    </div>
                                </>
                            ) : isSlack ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="slackAuthType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Auth Type</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select auth type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="bot_token">Bot Token</SelectItem>
                                                        <SelectItem value="webhook">Incoming Webhook</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {watchSlackAuthType === "bot_token" ? (
                                        <>
                                            <FormField
                                                control={form.control}
                                                name="slackBotToken"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bot Token</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" placeholder="xoxb-..." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                                <p className="font-medium mb-2">ℹ️ How to get a Slack Bot Token</p>
                                                <ol className="list-decimal list-inside space-y-1">
                                                    <li>Go to{" "}
                                                        <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">
                                                            api.slack.com/apps
                                                        </a>
                                                    </li>
                                                    <li>Create New App → From scratch</li>
                                                    <li>OAuth &amp; Permissions → Add Bot Token Scopes:
                                                        channels:read, channels:write, chat:write,
                                                        files:write, reactions:write, users:read,
                                                        groups:read, im:read
                                                    </li>
                                                    <li>Install to Workspace</li>
                                                    <li>Copy Bot User OAuth Token (xoxb-...)</li>
                                                </ol>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <FormField
                                                control={form.control}
                                                name="slackWebhookUrl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Webhook URL</FormLabel>
                                                        <FormControl>
                                                            <Input type="text" placeholder="https://hooks.slack.com/..." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                                <p className="font-medium mb-2">ℹ️ How to get a Slack Webhook URL</p>
                                                <ol className="list-decimal list-inside space-y-1">
                                                    <li>Go to{" "}
                                                        <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">
                                                            api.slack.com/apps
                                                        </a>
                                                    </li>
                                                    <li>Incoming Webhooks → Activate</li>
                                                    <li>Add New Webhook to Workspace</li>
                                                    <li>Copy Webhook URL</li>
                                                </ol>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : isCashfree ? (
                                <>
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-1">Cashfree Payment Gateway</p>
                                        <p>Used for Orders, Payments, Refunds, Settlements, Subscriptions, UPI, Payment Links, and Offers.</p>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="cashfreeClientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PG Client ID <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="Enter Cashfree PG Client ID" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="cashfreeClientSecret"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PG Client Secret <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Enter Cashfree PG Client Secret" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="cashfreeEnvironment"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Environment <span className="text-red-500">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value ?? "sandbox"}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select environment" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                                                        <SelectItem value="production">Production (Live)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                                        <p className="font-medium mb-1">Cashfree Payouts (Optional)</p>
                                        <p>Only required if you want to use the Payouts module. Payouts uses a different set of API keys than the Payment Gateway.</p>
                                    </div>

                                    <FormField
                                        control={form.control as any}
                                        name="cashfreePayoutClientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payouts Client ID</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="Enter Cashfree Payouts Client ID" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="cashfreePayoutClientSecret"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payouts Client Secret</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Enter Cashfree Payouts Client Secret" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : isPostgres ? (
                                <>
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                        <p className="font-medium mb-1">PostgreSQL Database Connection</p>
                                        <p>Secure credentials for connecting your PostgreSQL database. Ensure the host allows external connections from our servers if not locally hosted.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control as any}
                                            name="postgresHost"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Host <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input type="text" placeholder="e.g. localhost or postgres.example.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control as any}
                                            name="postgresPort"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Port <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="5432" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                            control={form.control as any}
                                            name="postgresDatabase"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Database Name <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="e.g. public_db" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control as any}
                                            name="postgresUser"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>User <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input type="text" placeholder="Database user" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control as any}
                                            name="postgresPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="Database password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                            control={form.control as any}
                                            name="postgresSsl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SSL Mode</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value ?? "disable"}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select SSL mode" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="disable">Disable (Default)</SelectItem>
                                                        <SelectItem value="require">Require (Managed DBs, Supabase, etc.)</SelectItem>
                                                        <SelectItem value="verify-full">Verify Full</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>Select Enable if connecting to Supabase, Neon, AWS RDS, etc.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : isGithubPAT ? (
                                <>
                                    <FormField
                                        control={form.control as any}
                                        name="githubAccessToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GitHub Personal Access Token (Classic or Fine-grained) <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="ghp_..." {...field} />
                                                </FormControl>
                                                <FormDescription>Token requires repo, workflow, read:org, and read:user scopes for full functionality.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="githubBaseUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GitHub API Base URL (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="text" placeholder="https://api.github.com" {...field} />
                                                </FormControl>
                                                <FormDescription>Leave blank for github.com. Change only if using GitHub Enterprise Server.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : isGithubApp ? (
                                <GithubConnectButton 
                                    credentialName={form.watch("name")}
                                    credentialType="GITHUB_APP"
                                    isConnected={isGithubOAuth}
                                    connectedUsername={connectedGithubUsername}
                                    onDisconnect={() => {
                                        setConnectedGithubUsername(undefined)
                                        setIsGithubOAuth(false)
                                    }}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Api Key</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="sk-..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}


                                />
                            )}

                            <div className="flex gap-4">
                                <Button type="submit"
                                    disabled={
                                        createCredential.isPending || updateCredential.isPending
                                    }
                                >{isEdit ? "Update" : "Create"}</Button>
                                <Button asChild variant="outline" onClick={() => router.push("/credentials")}>

                                    <Link href="/credentials" prefetch >Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}







export const CredentialView = ({ credentialId }: { credentialId: string }) => {
    const { data: credential } = useSuspennseCredential(credentialId);

    return (
        <CredentialForm initialData={credential} />
    )
}
