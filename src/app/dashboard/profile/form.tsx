'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/dashboard/actions'
import { Loader2, Save } from 'lucide-react'
import { isVerifiedStatusValue, normalizeRole } from '@/utils/profile-utils'
import Link from 'next/link'

interface ProfileData {
  avatar_url?: string | null
  full_name?: string | null
  email?: string | null
  role?: string | null
  status?: string | null
  approval_status?: string | null
  verified?: boolean | null
  age?: number | null
  gender?: string | null
  phone?: string | null
  state?: string | null
  district?: string | null
  city?: string | null
  qualification?: string | null
  specialization?: string | null
  experience?: string | null
  clinic_name?: string | null
  course?: string | null
  college?: string | null
  academic_year?: string | null
  gotra?: string | null
  show_phone?: boolean | null
}

interface ProfileFormProps {
  profile: ProfileData | null
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const initialRole = normalizeRole(profile?.role)
  const [selectedRole, setSelectedRole] = useState<'public' | 'doctor' | 'student'>(
    initialRole === 'doctor' || initialRole === 'student' ? initialRole : 'public'
  )
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const approvalState =
    profile?.verified || isVerifiedStatusValue(profile?.approval_status) || isVerifiedStatusValue(profile?.status)
      ? 'Verified'
      : profile?.status || profile?.approval_status || 'Pending'

  const handleSubmit = (formData: FormData) => {
    setMessage(null)
    startTransition(async () => {
      const result = await updateProfile(formData)
      
      if (result?.error) {
        const errorText = typeof result.error === 'string' 
          ? result.error 
          : 'Please check your inputs'
        setMessage({ type: 'error', text: errorText })
      } else if (result?.success) {
        setMessage({ type: 'success', text: result.success as string })
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
            Verification Status: {approvalState}
          </div>
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Photo</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile?.full_name || 'Profile photo'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                  No photo
                </div>
              )}
            </div>
            {profile?.avatar_url && (
              <Link
                href={profile.avatar_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
              >
                Open image URL
              </Link>
            )}
          </div>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Profile Photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
          />
          {profile?.avatar_url && (
            <p className="mt-2 text-xs text-gray-500">Current image is set. Uploading a new one will replace it.</p>
          )}
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as 'public' | 'doctor' | 'student')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="public">Public User</option>
            <option value="doctor">Doctor</option>
            <option value="student">Medical Student</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={profile?.gender || ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="fullName"
              id="fullName"
              defaultValue={profile?.full_name || ''}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Dr. John Doe"
              required
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Age
          </label>
          <input
            type="number"
            min={0}
            max={120}
            name="age"
            id="age"
            defaultValue={typeof profile?.age === 'number' ? profile.age : ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Age"
          />
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              id="email"
              value={profile?.email || ''}
              disabled
              className="block w-full rounded-md border-gray-300 bg-gray-100 text-gray-500 shadow-sm sm:text-sm py-2 px-3 border dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            defaultValue={profile?.phone || ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="+91..."
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            State
          </label>
          <input
            type="text"
            name="state"
            id="state"
            defaultValue={profile?.state || ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            District
          </label>
          <input
            type="text"
            name="district"
            id="district"
            defaultValue={profile?.district || ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            City
          </label>
          <input
            type="text"
            name="city"
            id="city"
            defaultValue={profile?.city || ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {selectedRole === 'doctor' && (
          <>
            <div className="sm:col-span-3">
              <label htmlFor="qualification" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Qualification
              </label>
              <input
                type="text"
                name="qualification"
                id="qualification"
                defaultValue={profile?.qualification || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Specialization
              </label>
              <input
                type="text"
                name="specialization"
                id="specialization"
                defaultValue={profile?.specialization || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Experience
              </label>
              <input
                type="text"
                name="experience"
                id="experience"
                defaultValue={profile?.experience || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. 8 years"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Clinic Name
              </label>
              <input
                type="text"
                name="clinicName"
                id="clinicName"
                defaultValue={profile?.clinic_name || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </>
        )}

        {selectedRole === 'student' && (
          <>
            <div className="sm:col-span-2">
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Course
              </label>
              <input
                type="text"
                name="course"
                id="course"
                defaultValue={profile?.course || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="college" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                College
              </label>
              <input
                type="text"
                name="college"
                id="college"
                defaultValue={profile?.college || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Year
              </label>
              <input
                type="text"
                name="academicYear"
                id="academicYear"
                defaultValue={profile?.academic_year || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="gotra" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gotra (Optional)
              </label>
              <input
                type="text"
                name="gotra"
                id="gotra"
                defaultValue={profile?.gotra || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </>
        )}

        {(selectedRole === 'doctor' || selectedRole === 'student') && (
          <div className="sm:col-span-6">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                name="showPhone"
                defaultChecked={Boolean(profile?.show_phone)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show my phone number to verified users
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="-ml-1 mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  )
}
