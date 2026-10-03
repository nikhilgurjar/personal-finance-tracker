// lib/driveClient.ts

const BACKUP_FOLDER_NAME = "Finio Backups"
const BACKUP_FILE_NAME = "finio-backup.json"

/**
 * Find a folder by name in the user's Drive root.
 * Returns the folder ID if found, or null.
 */
async function findFolder(
  folderName: string,
  accessToken: string
): Promise<string | null> {
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  )
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

/**
 * Create a folder in the user's Drive root. Returns the new folder ID.
 */
async function createFolder(
  folderName: string,
  accessToken: string
): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create Drive folder (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.id
}

/**
 * Find an existing backup file inside a specific folder.
 * Returns the file ID if found, or null.
 */
async function findExistingBackup(
  folderId: string,
  accessToken: string
): Promise<string | null> {
  const query = encodeURIComponent(
    `name = '${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed = false`
  )
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

/**
 * Uploads financial data to a visible "Finio Backups" folder in the user's
 * personal Google Drive. Creates the folder if it doesn't exist, and
 * overwrites the previous backup file instead of creating duplicates.
 *
 * Requires scope: https://www.googleapis.com/auth/drive.file
 */
export async function backupToDrive(financeData: unknown, googleAccessToken: string) {
  // 1. Find or create the backup folder
  let folderId = await findFolder(BACKUP_FOLDER_NAME, googleAccessToken)
  if (!folderId) {
    folderId = await createFolder(BACKUP_FOLDER_NAME, googleAccessToken)
  }

  // 2. Check if a previous backup file exists (to overwrite instead of duplicate)
  const existingFileId = await findExistingBackup(folderId, googleAccessToken)

  const contentString = JSON.stringify(financeData, null, 2)

  if (existingFileId) {
    // 3a. Update the existing file in-place
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: contentString,
      }
    )
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Drive backup update failed (${response.status}): ${errorText}`)
    }
    return await response.json()
  }

  // 3b. Create a new backup file inside the folder
  const boundary = "---------------------------finio_backup_boundary_" + Date.now()
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadata = {
    name: BACKUP_FILE_NAME,
    parents: [folderId],
  }

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    contentString +
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
