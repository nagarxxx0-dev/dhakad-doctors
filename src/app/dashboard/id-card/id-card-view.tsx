'use client'

import { useRef, useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Image from 'next/image'
import { Download, Loader2, ShieldCheck } from 'lucide-react'

interface IdCardViewProps {
  user: { id: string }
  profile: {
    full_name: string
    avatar_url?: string | null
    specialty?: string | null
    role?: string | null
  }
}

export default function IdCardView({ user, profile }: IdCardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [issuedDate, setIssuedDate] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setIssuedDate(new Date().toLocaleDateString())
    setOrigin(window.location.origin)
  }, [])

  const handleDownload = async () => {
    if (!cardRef.current) return

    setIsDownloading(true)
    try {
      // Wait for images to load if necessary, though usually handled by browser
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, // Critical for loading external images (Supabase Storage)
        scale: 3, // Higher scale for better quality
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      
      // ID-1 card size: 85.60 × 53.98 mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54],
      })

      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54)
      pdf.save(`${profile.full_name.replace(/\s+/g, '_')}_ID_Card.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Verification URL encoded in QR
  const qrValue = origin ? `${origin}/directory/verify/${user.id}` : ''

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* ID Card Container - Fixed Aspect Ratio for ID-1 */}
      <div className="relative group">
        <div
          ref={cardRef}
          className="w-[428px] h-[270px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-200"
          style={{ fontFamily: 'sans-serif' }} // Ensure consistent font for PDF
        >
          {/* Header Background */}
          <div className="h-24 bg-gradient-to-r from-blue-700 to-blue-500 w-full absolute top-0 left-0 z-0">
            <div className="absolute top-4 right-4 opacity-20">
              <ShieldCheck className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="z-10 flex flex-col h-full px-6 pt-6 pb-4">
            <div className="flex justify-between items-end mb-2">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    fill
                    sizes="96px"
                    unoptimized
                    className="object-cover"
                    crossOrigin="anonymous" // Required for html2canvas CORS
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 font-bold text-2xl">
                    {profile.full_name?.charAt(0) || 'D'}
                  </div>
                )}
              </div>
              
              {/* Organization Name */}
              <div className="text-right text-white mb-8">
                <h1 className="text-lg font-bold tracking-wide uppercase">Dhakad Doctors</h1>
                <p className="text-xs opacity-90">Community Member</p>
              </div>
            </div>

            <div className="flex justify-between items-end mt-auto">
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{profile.full_name}</h2>
                <p className="text-sm text-blue-600 font-medium">{profile.specialty || profile.role || 'Member'}</p>
                <div className="mt-3 text-xs text-gray-500">
                  <p>ID: {user.id.slice(0, 8).toUpperCase()}</p>
                  <p>Issued: {issuedDate}</p>
                </div>
              </div>

              <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                {qrValue && <QRCodeCanvas value={qrValue} size={64} level="M" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            Download ID Card
          </>
        )}
      </button>

      <p className="text-sm text-gray-500 max-w-md text-center">
        This digital ID card verifies your membership in the Dhakad Doctors community. 
        You can print it or save it to your device.
      </p>
    </div>
  )
}
