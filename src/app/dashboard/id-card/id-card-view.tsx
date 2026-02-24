'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Loader2, Printer, ShieldCheck } from 'lucide-react'

interface IdCardViewProps {
  user: { id: string }
  profile: {
    full_name: string
    avatar_url?: string | null
    role?: string | null
    district?: string | null
    member_id?: string | null
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

  const memberId = (profile.member_id || '').trim() || `DD-${user.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
  const roleLabel = (profile.role || 'Member').replace(/_/g, ' ')
  const districtLabel = profile.district || 'N/A'
  const qrValue = origin ? `${origin}/directory/verify/${user.id}` : ''

  const handleDownload = async () => {
    if (!cardRef.current) return

    setIsDownloading(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')

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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="id-card-area flex flex-col items-center space-y-6 print:space-y-0">
      <div className="relative w-full max-w-[428px] print:max-w-none">
        <div
          ref={cardRef}
          className="id-card-print-card mx-auto w-[340px] h-[214px] sm:w-[428px] sm:h-[270px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-200 print:shadow-none print:border-gray-300"
          style={{ fontFamily: 'sans-serif' }}
        >
          <div className="h-20 sm:h-24 bg-gradient-to-r from-blue-700 to-blue-500 w-full absolute top-0 left-0 z-0">
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 opacity-20">
              <ShieldCheck className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
            </div>
          </div>

          <div className="z-10 flex flex-col h-full px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <div className="flex justify-between items-end mb-2">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    fill
                    sizes="96px"
                    unoptimized
                    className="object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 font-bold text-2xl">
                    {profile.full_name?.charAt(0) || 'D'}
                  </div>
                )}
              </div>

              <div className="text-right text-white mb-6 sm:mb-8">
                <h1 className="text-sm sm:text-lg font-bold tracking-wide uppercase">Dhakad Doctors</h1>
                <p className="text-[10px] sm:text-xs opacity-90">Community Member</p>
              </div>
            </div>

            <div className="flex justify-between items-end mt-auto gap-2">
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 leading-tight truncate">{profile.full_name}</h2>
                <p className="text-xs sm:text-sm text-blue-700 font-semibold">Role: {roleLabel}</p>
                <p className="text-xs sm:text-sm text-blue-700 font-semibold">District: {districtLabel}</p>
                <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-gray-500">
                  <p>Member ID: {memberId}</p>
                  <p>Issued: {issuedDate}</p>
                </div>
              </div>

              <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100 shrink-0">
                {qrValue && <QRCodeCanvas value={qrValue} size={56} level="M" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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

        <button
          onClick={handlePrint}
          type="button"
          className="flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print ID Card
        </button>
      </div>

      <p className="no-print text-sm text-gray-500 max-w-md text-center">
        This digital ID card verifies your membership in the Dhakad Doctors community. You can print it or save it to your device.
      </p>
    </div>
  )
}
