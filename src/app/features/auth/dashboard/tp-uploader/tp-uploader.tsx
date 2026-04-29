"use client"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/src/components/ui/breadcrumb";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card"; 
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Select,  SelectContent,  SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Separator } from "@/src/components/ui/separator";
import { SidebarTrigger } from "@/src/components/ui/sidebar"; 
import { useTpUploader } from "./use-tpUploader";   
import { Badge } from "@/components/ui/badge" 
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { FileDown, Icon, PlusSquareIcon } from "lucide-react";
 
function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function TPUploaderUI() {
  const {
    state,
    onEffectivityDateChange,
    onCompanyChange,
    onFileChange,
    onSubmit,  
    companyOptions,
    loadingCompanies,
    emailOptions,
    loadingEmails,
    selectedEmails,
    emailQuery,
    addEmail,
    removeEmail, 
    onEmailQueryChange
  } = useTpUploader()

  const trimmedEmailQuery = emailQuery.trim()

  const resultTone =
    state.result?.status === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800"

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Transfer Price</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>TP Uploader</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <form className="mx-4 space-y-4" onSubmit={onSubmit}>
        <Card>
          <CardContent className="pt-6">
            <FieldGroup className="max-w-3xl gap-3">
              <Field className="grid grid-cols-1 items-start gap-y-1 md:grid-cols-[160px_1fr] md:items-center md:gap-x-4">
                <FieldLabel
                  htmlFor="tp-effectivity-date"
                  className="text-left md:text-right whitespace-nowrap"
                >
                  Effectivity Date:
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="tp-effectivity-date"
                    type="date"
                    className="w-full"
                    aria-invalid={!!state.fieldErrors.effectivityDate}
                    value={state.effectivityDate}
                    onChange={(event) => onEffectivityDateChange(event.target.value)}
                  />
                </FieldContent>
              </Field>

              <Field className="grid grid-cols-1 items-start gap-y-1 md:grid-cols-[160px_1fr] md:items-center md:gap-x-4">
                <FieldLabel
                  htmlFor="tp-company-name"
                  className="text-left md:text-right whitespace-nowrap"
                >
                  Company Name:
                </FieldLabel>
                <FieldContent>
                  <Select value={state.companyId} onValueChange={onCompanyChange}>
                    <SelectTrigger
                      id="tp-company-name"
                      className="w-full"
                      aria-invalid={!!state.fieldErrors.companyId}
                    >
                      <SelectValue placeholder={loadingCompanies ? "Loading companies..." : "Select a company"} />
                    </SelectTrigger>
                    <SelectContent>
                      {companyOptions.map((company, index) => (
                        <SelectItem key={company.id ?? `company-${index}`} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))} 
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field className="grid grid-cols-1 items-start gap-y-1 md:grid-cols-[160px_1fr] md:items-center md:gap-x-4">
                  <FieldLabel className="text-left md:text-right whitespace-nowrap">Email List:</FieldLabel>
                  <FieldContent>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          aria-invalid={!!state.fieldErrors.emails}
                        >
                          {emailQuery ? emailQuery : "Select or search email"}
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent className="p-0 ">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search email..."
                            value={emailQuery}
                            onValueChange={(value) => {
                              onEmailQueryChange(value)
                            }}
                          />
                          <CommandList key={emailOptions.length}>
                            {loadingEmails && <CommandEmpty>Loading...</CommandEmpty>}
                            {!loadingEmails && trimmedEmailQuery.length < 2 && (
                              <CommandEmpty>Type at least 2 characters.</CommandEmpty>
                            )}
                            {!loadingEmails && trimmedEmailQuery.length >= 2 && emailOptions.length === 0 && (
                              isValidEmailAddress(trimmedEmailQuery) ? (
                                <CommandItem
                                  value={trimmedEmailQuery}
                                  onSelect={() => {
                                    addEmail({
                                      id: `manual:${trimmedEmailQuery.toLowerCase()}`,
                                      email: trimmedEmailQuery,
                                      display: trimmedEmailQuery,
                                    })
                                    onEmailQueryChange("")
                                  }}
                                >
                                   {trimmedEmailQuery} <PlusSquareIcon className="ml-2 "  /> 
                                </CommandItem>
                              ) : (
                                <CommandEmpty>No results found. Enter a valid email to add.</CommandEmpty>
                              )
                            )}
                            {emailOptions.map((option) => (
                              <CommandItem
                                key={option.id}
                                value={option.email}
                                onSelect={() => {
                                  addEmail(option)
                                  onEmailQueryChange("")
                                }}
                              >
                                {option.display || option.email}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedEmails.map((email) => (
                        <Badge key={email.id} variant="secondary" className="flex items-center gap-1">
                          {email.email}
                          <button
                            type="button"
                            className="ml-1 text-xs"
                            onClick={() => removeEmail(email.id)}
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </FieldContent>
                </Field>


              <Field className="grid grid-cols-1 items-start gap-y-1 md:grid-cols-[160px_1fr] md:items-center md:gap-x-4">
                <FieldLabel
                  htmlFor="tp-file-upload"
                  className="text-left md:text-right whitespace-nowrap"
                >
                  Upload File:
                </FieldLabel>
                <FieldContent className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <Input
                    key={state.fileInputKey}
                    id="tp-file-upload"
                    type="file"
                    className="w-full bg-slate-200 border-0 rounded-md px-3 py-1.5 hover:bg-slate-300"
                    onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                    aria-invalid={!!state.fieldErrors.file}
                  />
                  <div className="flex items-center justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label="Generate template"
                        >
                          <FileDown />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Generate template</TooltipContent>
                    </Tooltip>
                  </div>
                </FieldContent>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={state.uploading}>
                  {state.uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>

          <CardContent className="border-t">
            <div className="text-sm text-muted-foreground">
              Please ensure your file is in the correct format before uploading.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 space-y-3">
            <FieldLabel className="text-lg">Upload Results</FieldLabel>
            {state.result ? (
              <>  
                <div className={`rounded-md border px-3 py-2 text-sm ${resultTone}`}>
                  {state.result.summary}
                </div>

                {state.result.items.length > 0 ? (
                  <div className="border rounded-md divide-y text-sm">
                    {state.result.items.map((item, index) => {
                      const statusClass =
                        item.status === "ok"
                          ? "text-green-600"
                          : item.status === "warning"
                          ? "text-amber-600"
                          : "text-red-600"

                      return (
                        <div key={`${item.row}-${index}`} className="flex justify-between px-3 py-2">
                          <span>Row {item.row}</span>
                          <span className={statusClass}>{item.message}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No upload results yet.</div>
            )}
          </CardContent>
        </Card>
      </form>
    </>
  )
}
