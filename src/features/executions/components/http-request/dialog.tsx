"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useEffect } from "react";
import { type Resolver, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const keyValuePairSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and can only contain letters, numbers, underscores, and $",
    }),
  endpoint: z.string().min(1, { message: "Please enter a valid URL" }),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
  body: z.string().optional(),
  contentType: z
    .enum(["json", "form-urlencoded", "form-data", "raw"])
    .optional(),
  headers: z.array(keyValuePairSchema).optional(),
  queryParameters: z.array(keyValuePairSchema).optional(),
  authType: z
    .enum(["none", "basicAuth", "bearerToken", "headerAuth"])
    .optional(),
  basicAuthUser: z.string().optional(),
  basicAuthPassword: z.string().optional(),
  bearerToken: z.string().optional(),
  headerAuthName: z.string().optional(),
  headerAuthValue: z.string().optional(),
  timeout: z.coerce.number().min(0).optional(),
  followRedirects: z.boolean().optional(),
  responseFormat: z.enum(["auto", "json", "text"]).optional(),
});

export type HttpRequestFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HttpRequestFormValues) => void;
  defaultValues?: Partial<HttpRequestFormValues>;
}

export const HttpRequestDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<HttpRequestFormValues>({
    resolver: zodResolver(formSchema) as Resolver<HttpRequestFormValues>,
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      endpoint: defaultValues.endpoint ?? (defaultValues as any).url ?? "",
      method: defaultValues.method ?? "GET",
      body: defaultValues.body ?? "",
      contentType: defaultValues.contentType ?? "json",
      headers: defaultValues.headers ?? [],
      queryParameters: defaultValues.queryParameters ?? [],
      authType: defaultValues.authType ?? "none",
      basicAuthUser: defaultValues.basicAuthUser ?? "",
      basicAuthPassword: defaultValues.basicAuthPassword ?? "",
      bearerToken: defaultValues.bearerToken ?? "",
      headerAuthName: defaultValues.headerAuthName ?? "",
      headerAuthValue: defaultValues.headerAuthValue ?? "",
      timeout: defaultValues.timeout ?? 30000,
      followRedirects: defaultValues.followRedirects ?? true,
      responseFormat: defaultValues.responseFormat ?? "auto",
    },
  });

  const headersArray = useFieldArray({
    control: form.control,
    name: "headers",
  });

  const queryParamsArray = useFieldArray({
    control: form.control,
    name: "queryParameters",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? "",
        endpoint: defaultValues.endpoint ?? (defaultValues as any).url ?? "",
        method: defaultValues.method ?? "GET",
        body: defaultValues.body ?? "",
        contentType: defaultValues.contentType ?? "json",
        headers: defaultValues.headers ?? [],
        queryParameters: defaultValues.queryParameters ?? [],
        authType: defaultValues.authType ?? "none",
        basicAuthUser: defaultValues.basicAuthUser ?? "",
        basicAuthPassword: defaultValues.basicAuthPassword ?? "",
        bearerToken: defaultValues.bearerToken ?? "",
        headerAuthName: defaultValues.headerAuthName ?? "",
        headerAuthValue: defaultValues.headerAuthValue ?? "",
        timeout: defaultValues.timeout ?? 30000,
        followRedirects: defaultValues.followRedirects ?? true,
        responseFormat: defaultValues.responseFormat ?? "auto",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myApiCall";
  const watchMethod = form.watch("method");
  const watchAuthType = form.watch("authType");
  const showBodyField = ["POST", "PUT", "PATCH", "DELETE"].includes(
    watchMethod,
  );

  const handleSubmit = (values: HttpRequestFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>HTTP Request</DialogTitle>
          <DialogDescription>
            Configure settings for the HTTP request node
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            {/* Variable Name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myApiCall" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the result:{" "}
                    {`{{${watchVariableName}.httpResponse.data}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Method */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="HEAD">HEAD</SelectItem>
                      <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The HTTP method to use for this request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Endpoint URL */}
            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://api.example.com/users/{{myVar.httpResponse.data.id}}"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Static URL or use {"{{variables}}"} for simple values or{" "}
                    {"{{json variable}}"} to stringify objects
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Authentication */}
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authentication</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select authentication" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="basicAuth">Basic Auth</SelectItem>
                      <SelectItem value="bearerToken">Bearer Token</SelectItem>
                      <SelectItem value="headerAuth">Header Auth</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchAuthType === "basicAuth" && (
              <div className="space-y-4 rounded-md border p-4">
                <FormField
                  control={form.control}
                  name="basicAuthUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="basicAuthPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {watchAuthType === "bearerToken" && (
              <div className="rounded-md border p-4">
                <FormField
                  control={form.control}
                  name="bearerToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bearer token or {{variable}}"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {watchAuthType === "headerAuth" && (
              <div className="space-y-4 rounded-md border p-4">
                <FormField
                  control={form.control}
                  name="headerAuthName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Name</FormLabel>
                      <FormControl>
                        <Input placeholder="X-API-Key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="headerAuthValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Value</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="API key or {{variable}}"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Query Parameters */}
            <div className="space-y-2">
              <FormLabel>Query Parameters</FormLabel>
              {queryParamsArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Key"
                    {...form.register(`queryParameters.${index}.key`)}
                  />
                  <Input
                    placeholder="Value"
                    {...form.register(`queryParameters.${index}.value`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => queryParamsArray.remove(index)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  queryParamsArray.append({
                    key: "",
                    value: "",
                  })
                }
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                Add Parameter
              </Button>
            </div>

            {/* Custom Headers */}
            <div className="space-y-2">
              <FormLabel>Headers</FormLabel>
              {headersArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Header name"
                    {...form.register(`headers.${index}.key`)}
                  />
                  <Input
                    placeholder="Header value"
                    {...form.register(`headers.${index}.value`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => headersArray.remove(index)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  headersArray.append({
                    key: "",
                    value: "",
                  })
                }
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                Add Header
              </Button>
            </div>

            {/* Content Type (for body methods) */}
            {showBodyField && (
              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="form-urlencoded">
                          Form URL-Encoded
                        </SelectItem>
                        <SelectItem value="form-data">
                          Multipart Form-Data
                        </SelectItem>
                        <SelectItem value="raw">Raw / Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Request Body */}
            {showBodyField && (
              <FormField
                name="body"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Body</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px] font-mono text-sm"
                        placeholder={
                          '{\n  "userId": "{{myVar.httpResponse.data.id}}",\n  "name": "{{myVar.httpResponse.data.name}}"\n}'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use {"{{variables}}"} for simple values or{" "}
                      {"{{json variable}}"} to stringify objects
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Response Format */}
            <FormField
              control={form.control}
              name="responseFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Format</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select response format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Auto-Detect</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How to parse the response body
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timeout */}
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                  <FormDescription>
                    Request timeout in milliseconds (default 30000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow Redirects */}
            <FormField
              control={form.control}
              name="followRedirects"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Follow Redirects</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
