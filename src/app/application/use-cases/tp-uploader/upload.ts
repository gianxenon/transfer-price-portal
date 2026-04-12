import { uploadTransferPriceFile, UploadResult } from "@/src/app/infrastructure/data-sources/tp-uploader/upload"

export async function submitTpUpload(formData: FormData): Promise<UploadResult> {
  return uploadTransferPriceFile(formData)
}
