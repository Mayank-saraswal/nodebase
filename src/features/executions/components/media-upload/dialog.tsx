"use client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { MediaUploadSource } from "@/generated/prisma"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { message: "Variable name is required" })
        .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/, {
            message: "Must start with letter/underscore, contain only letters/numbers/underscores",
        }),
    source: z.nativeEnum(MediaUploadSource),
    inputField: z.string().min(1, { message: "Input field is required" }),
    mimeTypeHint: z.string().min(1, { message: "MIME type is required" }),
    filename: z.string().optional(),
    credentialId: z.string().optional().nullable(),
    continueOnFail: z.boolean().optional(),
})

export type MediaUploadFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: MediaUploadFormValues) => void
    defaultValues?: Partial<MediaUploadFormValues>
    nodeId?: string
    workflowId?: string
}

export const MediaUploadDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
    nodeId,
    workflowId,
}: Props) => {
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    // Pre-fill from DB
    const { data: dbConfig } = useQuery(
        trpc.mediaUpload.getByNodeId.queryOptions(
            { nodeId: nodeId! },
            { enabled: open && !!nodeId }
        )
    )

    const upsertMutation = useMutation(
        trpc.mediaUpload.upsert.mutationOptions({
            onSuccess: () => {
                if (nodeId) {
                    queryClient.invalidateQueries(
                        trpc.mediaUpload.getByNodeId.queryOptions({ nodeId })
                    )
                }
            },
        })
    )

    const form = useForm<MediaUploadFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "media",
            source: defaultValues.source || MediaUploadSource.URL,
            inputField: defaultValues.inputField || "",
            mimeTypeHint: defaultValues.mimeTypeHint || "image/png",
            filename: defaultValues.filename || "",
            credentialId: defaultValues.credentialId || null,
            continueOnFail: defaultValues.continueOnFail || false,
        },
    })

    // Pre-fill from DB config when loaded
    useEffect(() => {
        if (dbConfig) {
            form.reset({
                variableName: dbConfig.variableName,
                source: dbConfig.source,
                inputField: dbConfig.inputField,
                mimeTypeHint: dbConfig.mimeTypeHint,
                filename: dbConfig.filename ?? "",
                credentialId: dbConfig.credentialId ?? null,
                continueOnFail: dbConfig.continueOnFail,
            })
        }
    }, [dbConfig, form])

    useEffect(() => {
        if (open && !dbConfig) {
            form.reset({
                variableName: defaultValues.variableName || "media",
                source: defaultValues.source || MediaUploadSource.URL,
                inputField: defaultValues.inputField || "",
                mimeTypeHint: defaultValues.mimeTypeHint || "image/png",
                filename: defaultValues.filename || "",
                credentialId: defaultValues.credentialId || null,
                continueOnFail: defaultValues.continueOnFail || false,
            })
        }
    }, [open, dbConfig, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "media"
    const watchSource = form.watch("source")

    const handleFormSubmit = (values: MediaUploadFormValues) => {
        onSubmit(values)

        // Persist to DB if nodeId and workflowId are available
        if (nodeId && workflowId) {
            upsertMutation.mutate({
                nodeId,
                workflowId,
                source: values.source,
                inputField: values.inputField,
                mimeTypeHint: values.mimeTypeHint,
                filename: values.filename ?? "",
                credentialId: values.credentialId ?? null,
                variableName: values.variableName,
                continueOnFail: values.continueOnFail ?? false,
            })
        }

        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Media Upload Configuration</DialogTitle>
                    <DialogDescription>
                        Upload media from any source to cloud storage and receive a permanent, 48-hour presigned URL.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="media" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Used to access the outputs: {`{{${watchVariableName}.url}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a source" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={MediaUploadSource.URL}>Direct URL (HTTPS)</SelectItem>
                                            <SelectItem value={MediaUploadSource.BASE64}>Base64 Data</SelectItem>
                                            <SelectItem value={MediaUploadSource.GOOGLE_DRIVE} disabled>Google Drive (Coming Soon)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="inputField"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Input Data</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="min-h-[80px] font-mono text-sm"
                                            placeholder={watchSource === MediaUploadSource.URL ? "https://example.com/image.png" : "data:image/png;base64,iVBORw0KGgo..."}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        URL or Template reference evaluating to a URL/Base64 string.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="mimeTypeHint"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>MIME Type Hint</FormLabel>
                                        <FormControl>
                                            <Input placeholder="image/png" {...field} />
                                        </FormControl>
                                        <FormDescription>Used if type cannot be auto-detected.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="filename"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Filename (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="my-image.png" {...field} />
                                        </FormControl>
                                        <FormDescription>Auto-generated if left empty.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="continueOnFail"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Continue on failure</FormLabel>
                                        <FormDescription>
                                            If upload fails, the workflow will continue and set {`{{${watchVariableName}.error}}`} instead of crashing.
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground mt-4">
                            <strong>Output Variables:</strong>
                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                <li><code>url</code> - Permanent SAS URL (48 hrs)</li>
                                <li><code>mimeType</code> - e.g. &quot;image/png&quot;</li>
                                <li><code>sizeBytes</code> - File size in bytes</li>
                                <li><code>expiresAt</code> - Expiration timestamp</li>
                            </ul>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={upsertMutation.isPending}>
                                {upsertMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
