// lib/driveClient.ts

/**
 * Uploads financial data to the user's private Google Drive appData folder.
 * Uses Google Drive REST API v3 multipart upload.
 */
export async function backupToDrive(financeData: unknown, googleAccessToken: string) {
  const boundary = "---------------------------finio_backup_boundary_" + Date.now()
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadata = {
    name: "finio-backup.json",
    parents: ["appDataFolder"],
  }

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(financeData) +
    closeDelimiter

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Drive backup failed (${response.status}): ${errorText}`)
  }

  return await response.json()
}
