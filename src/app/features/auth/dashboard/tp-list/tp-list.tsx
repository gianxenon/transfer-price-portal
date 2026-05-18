"use client"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/src/components/ui/breadcrumb";
import { SidebarTrigger } from "@/src/components/ui/sidebar";
import { Separator } from "@/src/components/ui/separator";
import { Card, CardContent } from "@/src/components/ui/card";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Button } from "@/src/components/ui/button";
import { columns } from "./column";
import { DataTable } from "./data-table";
import { useTpList } from "./use-tplist"; 

export function TpList() {
  const {
  state,
  rows,
  loadingRows,
  companyOptions,
  loadingCompanies,
  onEffectivityDateChange,
  onCompanyChange,
  onSubmit,
} = useTpList()


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
                <BreadcrumbPage>TP List</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
  </header>
      <form className = "mx-4 space-y-4" onSubmit={onSubmit}>  
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
                        <Field className="grid grid-cols-1 items-start gap-y-1 md:grid-cols-[160px_1fr] md:items-center md:gap-x-4">
                            <FieldLabel
                            htmlFor="tp-company-name"
                            className="text-left md:text-right whitespace-nowrap"
                            >
                            Company Name:
                            </FieldLabel>
                            <FieldContent>
                                <Select
                                  value={String(state.companyId || "")}
                                  onValueChange={onCompanyChange}
                                >
                                    <SelectTrigger
                                      id="tp-company-name"
                                      className="w-full"
                                      aria-invalid={!!state.fieldErrors.companyId}
                                     >
                                      <SelectValue 
                                        placeholder={loadingCompanies ? "Loading companies..." : "Select a company"} 
                                      />
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
                    </Field>
                    <div className="flex justify-end gap-4 pt-2">
                        <Button type="submit">Filter</Button>
                             {/* // disabled={state.uploading}>
                             //</div>{state.uploading ? "Uploading..." : "Upload"} */} 
                    </div>
                 </FieldGroup>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="py-4 space-y-3">
                {loadingRows ? (
                    <div>Loading transfer price list...</div>
                ) : rows.length === 0 ? (
                    <div>No transfer price data found for the selected criteria.</div>
                ) : (
                    <DataTable columns={columns} data={rows} />
                )}
            </CardContent>
        </Card>
      </form>
   </>
  )
}
