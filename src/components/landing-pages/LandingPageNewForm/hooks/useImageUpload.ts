import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLandingPageForm } from '../context'

/**
 * Image compression utility
 * @param file File to compress
 * @param maxWidth Maximum width for the compressed image
 * @param quality Compression quality (0-1)
 * @returns Compressed image blob
 */
const compressImage = async (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      // Resize if larger than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Image compression failed'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = reject
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Hook for handling image uploads
 * @param companyId Company ID for storage path
 */
export const useImageUpload = (companyId: string) => {
  const { state, actions } = useLandingPageForm()
  const supabase = createClient()

  /**
   * Handle hero image upload (multiple images)
   */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      actions.setSaving(true)
      try {
        // Process all files in parallel
        const uploadPromises = Array.from(files).map(async (file) => {
          try {
            // Compress image before upload
            const compressedBlob = await compressImage(file)

            // Generate unique filename
            const fileExt = 'jpg' // Always use jpg after compression
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
            const filePath = `landing-pages/${companyId}/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage.from('public-assets').upload(filePath, compressedBlob, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            })

            if (uploadError) {
              console.error('Upload error:', uploadError)
              throw uploadError
            }

            // Get public URL
            const {
              data: { publicUrl },
            } = supabase.storage.from('public-assets').getPublicUrl(filePath)

            return publicUrl
          } catch (error) {
            console.error('Error processing file:', file.name, error)
            return null
          }
        })

        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises)
        const uploadedUrls = results.filter((url): url is string => url !== null)

        if (uploadedUrls.length === 0) {
          throw new Error('모든 이미지 업로드가 실패했습니다.')
        }

        if (uploadedUrls.length < files.length) {
          alert(`${files.length - uploadedUrls.length}개의 이미지 업로드가 실패했습니다.`)
        }

        // Add uploaded images to state
        actions.setImages([...state.images, ...uploadedUrls])
      } catch (error) {
        console.error('Error uploading images:', error)
        alert('이미지 업로드 중 오류가 발생했습니다: ' + (error as Error).message)
      } finally {
        actions.setSaving(false)
      }
    },
    [companyId, state.images, actions, supabase]
  )

  /**
   * Handle completion background image upload (single image)
   */
  const handleCompletionBgUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다.')
        return
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        alert('이미지 크기는 2MB 이하여야 합니다.')
        return
      }

      actions.setUploadingCompletionBg(true)
      try {
        // Compress image before upload
        const compressedBlob = await compressImage(file, 1200, 0.85)

        // Generate unique filename
        const fileExt = file.type.split('/')[1]
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `completion-backgrounds/${companyId}/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('landing-page-images')
          .upload(filePath, compressedBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('landing-page-images').getPublicUrl(filePath)

        actions.setCompletionBgImage(publicUrl)
      } catch (error) {
        console.error('Error uploading completion background:', error)
        alert('이미지 업로드 중 오류가 발생했습니다: ' + (error as Error).message)
      } finally {
        actions.setUploadingCompletionBg(false)
      }
    },
    [companyId, actions, supabase]
  )

  return {
    handleFileUpload,
    handleCompletionBgUpload,
    removeImage: actions.removeImage,
  }
}
