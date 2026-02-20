'use client'

import { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'

interface UploadBoxProps {
  userId: string
  bucket: 'profiles' | 'id-cards'
  label: string
  defaultUrl?: string | null
  onSave: (url: string) => Promise<{ error?: string | null; success?: string | null } | undefined>
}

export default function UploadBox({ userId, bucket, label, defaultUrl, onSave }: UploadBoxProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(defaultUrl || null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File) => {
    // Reset states
    setError(null)
    setSuccess(false)

    // Check type (Image or PDF)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Only images and PDF files are allowed.')
      return false
    }

    // Check size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.')
      return false
    }

    return true
  }, [])

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!validateFile(selectedFile)) return

    setFile(selectedFile)

    // Create local preview
    if (selectedFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)
    } else {
      setPreview(null) // No preview for PDF, just icon
    }
  }, [validateFile])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(10) // Start progress
    setError(null)

    try {
      const supabase = createClient()
      // Sanitize filename to avoid issues
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `user-${userId}/${sanitizedFileName}`

      // Simulate progress since supabase-js upload doesn't provide callback easily
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev))
      }, 200)

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
        })

      clearInterval(progressInterval)

      if (uploadError) throw uploadError

      setProgress(100)

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      // Save to DB via Server Action
      const result = await onSave(publicUrl)

      if (result?.error) {
        throw new Error(result.error)
      }

      setSuccess(true)
      setFile(null) // Clear file input after success
    } catch (err: unknown) {
      console.error('Upload failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file.')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setFile(null)
    setPreview(defaultUrl || null)
    setError(null)
    setSuccess(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="w-full space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
          error ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 
          success ? 'border-green-300 bg-green-50 dark:bg-green-900/10' :
          'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        {preview ? (
          <div className="relative w-full max-w-xs aspect-video mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/5">
            <Image src={preview} alt="Preview" fill unoptimized className="object-contain" />
            {!uploading && !success && (
              <button
                onClick={clearSelection}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-600"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : file && file.type === 'application/pdf' ? (
          <div className="flex flex-col items-center mb-4 text-gray-600 dark:text-gray-300">
            <FileText className="w-12 h-12 mb-2" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <UploadCloud className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        )}

        {!file && !uploading && !success && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline focus:outline-none"
            >
              Click to upload
            </button>
            <span className="text-gray-500 dark:text-gray-400"> or drag and drop</span>
            <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG or PDF (max 5MB)</p>
          </div>
        )}

        {file && !uploading && !success && (
          <button
            type="button"
            onClick={handleUpload}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
          >
            Upload {file.name}
          </button>
        )}

        {uploading && (
          <div className="w-full max-w-xs space-y-2 text-center">
            <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading... {progress}%
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {success && (
          <div className="flex flex-col items-center text-green-600 dark:text-green-400">
            <CheckCircle className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Upload Complete!</span>
            <button
              type="button"
              onClick={clearSelection}
              className="mt-2 text-xs underline hover:text-green-700"
            >
              Upload another
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center text-red-500 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded text-sm">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={onInputChange}
        />
      </div>
    </div>
  )
}
