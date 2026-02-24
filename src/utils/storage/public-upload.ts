import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type StorageProvider = 'supabase' | 'r2'

type SupabaseStorageLike = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options?: { cacheControl?: string; upsert?: boolean; contentType?: string }
      ) => PromiseLike<{ error: { message: string } | null }>
      getPublicUrl: (path: string) => { data: { publicUrl: string } }
    }
  }
}

interface UploadParams {
  supabase: SupabaseStorageLike
  file: File
  ownerId: string
  supabaseBucket: string
}

interface UploadResult {
  url: string | null
  error: string | null
}

let cachedR2Client: S3Client | null = null

function getProvider(): StorageProvider {
  const value = (process.env.FILE_STORAGE_PROVIDER || 'supabase').trim().toLowerCase()
  return value === 'r2' ? 'r2' : 'supabase'
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicBaseUrl = normalizeBaseUrl(process.env.R2_PUBLIC_BASE_URL)

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const defaultPublicBase = `https://${bucket}.${accountId}.r2.cloudflarestorage.com`

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl || defaultPublicBase,
  }
}

function getR2Client(config: NonNullable<ReturnType<typeof getR2Config>>) {
  if (!cachedR2Client) {
    cachedR2Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  return cachedR2Client
}

function getFilePath(ownerId: string, fileName: string) {
  return `${ownerId}/${Date.now()}-${crypto.randomUUID()}-${fileName}`
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim()
  if (!trimmed) return 'upload.bin'
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function uploadToSupabase(params: UploadParams): Promise<UploadResult> {
  const fileName = sanitizeFileName(params.file.name || 'upload.bin')
  const filePath = getFilePath(params.ownerId, fileName)

  const { error } = await params.supabase.storage.from(params.supabaseBucket).upload(filePath, params.file, {
    cacheControl: '3600',
    upsert: false,
    contentType: params.file.type || undefined,
  })

  if (error) {
    return { url: null, error: error.message }
  }

  const {
    data: { publicUrl },
  } = params.supabase.storage.from(params.supabaseBucket).getPublicUrl(filePath)

  return { url: publicUrl, error: null }
}

async function uploadToR2(params: UploadParams): Promise<UploadResult> {
  const config = getR2Config()
  if (!config) {
    return {
      url: null,
      error:
        'R2 is enabled but env is incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.',
    }
  }

  const client = getR2Client(config)
  const fileName = sanitizeFileName(params.file.name || 'upload.bin')
  const filePath = getFilePath(params.ownerId, fileName)
  const objectKey = `${params.supabaseBucket}/${filePath}`
  const fileBuffer = Buffer.from(await params.file.arrayBuffer())

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: params.file.type || 'application/octet-stream',
      CacheControl: 'public, max-age=3600',
    })
  )

  const objectUrl = `${normalizeBaseUrl(config.publicBaseUrl)}/${objectKey}`
  return { url: objectUrl, error: null }
}

export async function uploadPublicFile(params: UploadParams): Promise<UploadResult> {
  const provider = getProvider()

  try {
    if (provider === 'r2') {
      return await uploadToR2(params)
    }

    return await uploadToSupabase(params)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected upload error'
    return { url: null, error: message }
  }
}
