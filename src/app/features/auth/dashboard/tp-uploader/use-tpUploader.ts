import React from "react"
import { submitTpUpload } from "@/src/app/application/use-cases/tp-uploader/upload"
import { initialTpUploaderState, tpUploaderReducer } from "./state"
import { toast } from "sonner"


type CompanyOption = {
  id: string
  name: string
}

type EmailOption = {
  id: string
  email: string
  display: string
}
 
export function useTpUploader() {
  const MIN_EMAIL_QUERY_LENGTH = 2
  const EMAIL_DEBOUNCE_MS = 300

  const [companyOptions, setCompanyOptions] = React.useState<CompanyOption[]>([])
  const [loadingCompanies, setLoadingCompanies] = React.useState(false) 
  const [emailOptions, setEmailOptions] = React.useState<EmailOption[]>([])
  const [loadingEmails, setLoadingEmails] = React.useState(false)
  const [selectedEmails, setSelectedEmails] = React.useState<EmailOption[]>([])
  const [emailQuery, setEmailQuery] = React.useState("")
  const emailDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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
      const mapped = data.map((row) => ({
        id: String(row.CustomersMotherCompanyId),
        name: row.CustomersMotherCompanyName,
      }))
      setCompanyOptions(mapped)
     } finally {
      setLoadingCompanies(false)
    }
  }
  React.useEffect(() => {
    void loadCompanies()
  }, [])

  async function searchEmails(query: string) {
    if (query.trim().length < MIN_EMAIL_QUERY_LENGTH) {
      setEmailOptions([])
      setLoadingEmails(false)
      return
    }
    setLoadingEmails(true)
    try{
      const res = await fetch(`/api/emailreceipient?query=${encodeURIComponent(query)}`)
      if (!res.ok) {
        toast.error("Failed to load email addresses. Please try again.")
        return
      }
      const data = (await res.json()) as Array<{
        id: number | string
        fullname?: string | null
        emailaddress: string
      }>
      const mapped = data.map((row) => ({
        id: String(row.id),
        email: row.emailaddress,
        display: row.fullname ? `${row.fullname} (${row.emailaddress})` : row.emailaddress,
      }))
      setEmailOptions(mapped)
    }finally {
      setLoadingEmails(false)
    }
  }
  
  React.useEffect(() => {
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current)
    }

    if (emailQuery.trim().length < MIN_EMAIL_QUERY_LENGTH) {
      setEmailOptions([])
      setLoadingEmails(false)
      return
    }

    emailDebounceRef.current = setTimeout(() => {
      void searchEmails(emailQuery.trim())
    }, EMAIL_DEBOUNCE_MS)

    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current)
      }
    }
  }, [emailQuery])

  const onEmailQueryChange = React.useCallback((value: string) => {
    dispatch({ type: "FIELD_ERROR_CLEARED", field: "emails" })
    setEmailQuery(value)
  }, [])

  function addEmail(email: EmailOption) {
    if (!selectedEmails.some((item) => item.id === email.id)) {
      setSelectedEmails((prev) => [...prev, email])
      dispatch({ type: "FIELD_ERROR_CLEARED", field: "emails" })
    }
  }
  function removeEmail(id: string) {
    setSelectedEmails((prev) => prev.filter((e) => e.id !== id))
  }



  const [state, dispatch] = React.useReducer(tpUploaderReducer, initialTpUploaderState)


  const onEffectivityDateChange = React.useCallback((value: string) => {
    dispatch({ type: "FIELD_ERROR_CLEARED", field: "effectivityDate" })
    dispatch({ type: "EFFECTIVITY_CHANGED", value })
  }, [])

  const onCompanyChange = React.useCallback((value: string) => {
    dispatch({ type: "FIELD_ERROR_CLEARED", field: "companyId" })
    dispatch({ type: "COMPANY_CHANGED", value })
  }, [])
  function isXlsx(file: File) {
    const validMime =
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    const validExt = file.name.toLowerCase().endsWith(".xlsx")
    return validMime || validExt
  }
  const onFileChange = React.useCallback((file: File | null) => {
    if (!file) {
      dispatch({ type: "FILE_CHANGED", file: null })
      return
    }
    if (!isXlsx(file)) {
      const message = "Only .xlsx files are allowed."
      toast.error(message)
      dispatch({ type: "FIELD_ERROR_SET", field: "file", message })
      dispatch({ type: "FILE_INPUT_RESET" })
      return
    }
    dispatch({ type: "FIELD_ERROR_CLEARED", field: "file" })
    dispatch({ type: "FILE_CHANGED", file })
  }, [])

  const onSubmit = React.useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault()
      dispatch({ type: "UPLOAD_STARTED" })

    
      if (!state.effectivityDate) {
        const summary = "Please select an effectivity date."
        dispatch({ type: "FIELD_ERROR_SET", field: "effectivityDate", message: summary })
        dispatch({ type: "UPLOAD_FAILED", summary })
        dispatch({ type: "UPLOAD_FINISHED" })
        toast.error(summary)
        return
      }
      if (!state.companyId) {
        const summary = "Please select a company."
        dispatch({ type: "FIELD_ERROR_SET", field: "companyId", message: summary })
        dispatch({ type: "UPLOAD_FAILED", summary })
        dispatch({ type: "UPLOAD_FINISHED" })
        toast.error(summary)
        return
      }
      if (selectedEmails.length === 0) {
        const summary = "Please select at least one email address."
        dispatch({ type: "FIELD_ERROR_SET", field: "emails", message: summary })
        dispatch({ type: "UPLOAD_FAILED", summary })
        dispatch({ type: "UPLOAD_FINISHED" })
        toast.error(summary)
        return
      }
      if (!state.file) {
        const summary = "Please choose a file to upload."
        dispatch({ type: "FIELD_ERROR_SET", field: "file", message: summary })
        dispatch({ type: "FILE_INPUT_RESET" })
        dispatch({ type: "UPLOAD_FAILED", summary })
        dispatch({ type: "UPLOAD_FINISHED" })
        toast.error(summary)
        return
      }

      const formData = new FormData()
      formData.append("effectivityDate", state.effectivityDate)
      formData.append("companyId", state.companyId)
      const emailList = selectedEmails.map((email) => email.email).join("; ")
      formData.append("emailList", emailList)
      formData.append("file", state.file)

      try {
        const result = await submitTpUpload(formData)

        if (!result.ok) {
          const summary = result.message || "Upload failed. Please try again."
          dispatch({
            type: "UPLOAD_FAILED",
            summary,
            items: result.items,
          })
          toast.error(summary)
          return
        }

        const summary = result.summary || "Upload successful."
        dispatch({
          type: "UPLOAD_SUCCEEDED",
          summary,
          items: result.items,
        })
        toast.success(summary)
      } catch {
        const summary = "Upload failed. Please try again."
        dispatch({ type: "UPLOAD_FAILED", summary })
        toast.error(summary)
      } finally {
        dispatch({ type: "UPLOAD_FINISHED" })
      }
    },
    [selectedEmails, state.companyId, state.effectivityDate, state.file]
  )

  const clearResult = React.useCallback(() => {
    dispatch({ type: "RESULT_CLEARED" })
  }, [])

  return {
    state,
    onEffectivityDateChange,
    onCompanyChange,
    onFileChange,
    onSubmit,
    clearResult,
    companyOptions,
    loadingCompanies,
    addEmail,
    removeEmail,
    emailOptions,
    loadingEmails,
    selectedEmails,
    emailQuery,
    onEmailQueryChange
  }
}
