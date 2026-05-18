"use client"

import React from "react"
import { toast } from "sonner"
import { initialTpListState, tpListReducer } from "./state"
import type { TpRow } from "./column"

type CompanyOption = {
  id: string
  name: string
}

export function useTpList() {
  const [state, dispatch] = React.useReducer(tpListReducer, initialTpListState)
  const [companyOptions, setCompanyOptions] = React.useState<CompanyOption[]>([])
  const [loadingCompanies, setLoadingCompanies] = React.useState(false)
  const [rows, setRows] = React.useState<TpRow[]>([])
  const [loadingRows, setLoadingRows] = React.useState(false)

  const loadTpList = React.useCallback(
    async (filters?: { effectivityDate: string; companyId: number }) => {
      const effectivityDate = filters?.effectivityDate ?? state.effectivityDate
      const companyId = filters?.companyId ?? state.companyId

      setLoadingRows(true)

      try {
        const params = new URLSearchParams({
          effectivityDate,
          companyId: String(companyId),
        })

        const res = await fetch(`/api/tp-list?${params.toString()}`)
        if (!res.ok) {
          toast.error("Failed to load TP List.")
          return
        }

        const data = (await res.json()) as TpRow[]
        setRows(data)
      } catch {
        toast.error("Failed to load TP List.")
      } finally {
        setLoadingRows(false)
      }
    },
    [state.companyId, state.effectivityDate]
  )

  async function loadCompanies() {
    setLoadingCompanies(true)

    try {
      const res = await fetch("/api/mothercompanies")
      if (!res.ok) {
        toast.error("Failed to load companies. Please try again.")
        return
      }

      const data = (await res.json()) as Array<{
        CustomersMotherCompanyId: number | string
        CustomersMotherCompanyName: string
      }>

      setCompanyOptions(
        data.map((row) => ({
          id: String(row.CustomersMotherCompanyId),
          name: row.CustomersMotherCompanyName,
        }))
      )
    } catch {
      toast.error("Failed to load companies. Please try again.")
    } finally {
      setLoadingCompanies(false)
    }
  }

  React.useEffect(() => {
    void loadCompanies()
  }, [])

  const onEffectivityDateChange = React.useCallback((value: string) => {
    dispatch({ type: "FIELD_ERROR_CLEARED", field: "effectivityDate" })
    dispatch({ type: "EFFECTIVITY_CHANGED", value })
  }, [])

  const onCompanyChange = React.useCallback((value: string) => {
    dispatch({ type: "FIELD_ERROR_CLEARED", field: "companyId" })
    const parsedCompanyId = Number(value)
    dispatch({
      type: "COMPANY_CHANGED",
      value: Number.isInteger(parsedCompanyId) ? parsedCompanyId : 0,
    })
  }, [])

  const onSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!state.effectivityDate) {
        const message = "Please select an effectivity date."
        dispatch({ type: "FIELD_ERROR_SET", field: "effectivityDate", message })
        toast.error(message)
        return
      }

      if (!state.companyId) {
        const message = "Please select a company."
        dispatch({ type: "FIELD_ERROR_SET", field: "companyId", message })
        toast.error(message)
        return
      }

      await loadTpList({
        effectivityDate: state.effectivityDate,
        companyId: state.companyId,
      })
    },
    [loadTpList, state.companyId, state.effectivityDate]
  )

  return {
    state,
    rows,
    loadingRows,
    companyOptions,
    loadingCompanies,
    onEffectivityDateChange,
    onCompanyChange,
    onSubmit,
  }
}
