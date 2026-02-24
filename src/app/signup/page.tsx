'use client'

import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { AlertCircle, CheckCircle, Loader2, Lock, Mail, User, UserPlus } from 'lucide-react'
import { signUp } from '@/app/auth/actions'

const signupSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    role: z.enum(['public', 'doctor', 'student']),
    age: z.coerce.number().int().min(1, 'Age is required').max(120, 'Age must be valid'),
    gender: z.string().min(1, 'Gender is required'),
    phone: z.string().min(7, 'Phone is required').max(30, 'Phone is too long'),
    state: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    experience: z.string().optional(),
    clinicName: z.string().optional(),
    course: z.string().optional(),
    college: z.string().optional(),
    academicYear: z.string().optional(),
    gotra: z.string().optional(),
    showPhone: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.role === 'doctor') {
      if (!data.qualification?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['qualification'], message: 'Qualification is required' })
      }
      if (!data.specialization?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['specialization'], message: 'Specialization is required' })
      }
      if (!data.state?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state'], message: 'State is required' })
      }
      if (!data.district?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District is required' })
      }
      if (!data.city?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'City is required' })
      }
    }

    if (data.role === 'student') {
      if (!data.course?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['course'], message: 'Course is required' })
      }
      if (!data.college?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['college'], message: 'College is required' })
      }
      if (!data.academicYear?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['academicYear'], message: 'Year is required' })
      }
      if (!data.state?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state'], message: 'State is required' })
      }
      if (!data.district?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District is required' })
      }
      if (!data.city?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'City is required' })
      }
    }
  })

type SignupFormValues = z.infer<typeof signupSchema>

const serverFieldMap: Record<string, keyof SignupFormValues> = {
  clinic_name: 'clinicName',
  academic_year: 'academicYear',
  show_phone: 'showPhone',
}

export default function SignupPage() {
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'public',
      age: undefined,
      gender: '',
      phone: '',
      state: '',
      district: '',
      city: '',
      qualification: '',
      specialization: '',
      experience: '',
      clinicName: '',
      course: '',
      college: '',
      academicYear: '',
      gotra: '',
      showPhone: false,
    },
  })

  const selectedRole = useWatch({ control, name: 'role' }) || 'public'

  const onSubmit = (data: SignupFormValues) => {
    setGlobalError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('password', data.password)
      formData.append('role', data.role)
      formData.append('age', String(data.age))
      formData.append('gender', data.gender)
      formData.append('phone', data.phone)
      if (data.state) formData.append('state', data.state)
      if (data.district) formData.append('district', data.district)
      if (data.city) formData.append('city', data.city)
      if (data.qualification) formData.append('qualification', data.qualification)
      if (data.specialization) formData.append('specialization', data.specialization)
      if (data.experience) formData.append('experience', data.experience)
      if (data.clinicName) formData.append('clinicName', data.clinicName)
      if (data.course) formData.append('course', data.course)
      if (data.college) formData.append('college', data.college)
      if (data.academicYear) formData.append('academicYear', data.academicYear)
      if (data.gotra) formData.append('gotra', data.gotra)
      if (data.showPhone) formData.append('showPhone', 'on')

      const result = await signUp(formData)

      if (result?.error) {
        if (typeof result.error === 'string') {
          setGlobalError(result.error)
        } else if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([key, val]) => {
            const message = Array.isArray(val) ? val[0] : undefined
            const mappedKey = (serverFieldMap[key] || key) as keyof SignupFormValues
            if (message) {
              setError(mappedKey, { message })
            }
          })
        }
      } else if (result?.success) {
        setSuccessMessage(result.success as string)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-blue-950 to-blue-800 p-6 text-center sm:p-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Create Account</h2>
          <p className="mt-2 text-sm text-blue-100 sm:text-base">
            Register now. Your profile will stay pending until admin verification.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {successMessage ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Success</h3>
              <p className="text-gray-600">{successMessage}</p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {globalError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{globalError}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('name')}
                      type="text"
                      placeholder="Enter full name"
                      className="block w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Age</label>
                  <input
                    {...register('age')}
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Age"
                    className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Gender</label>
                  <select
                    {...register('gender')}
                    className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    placeholder="+91..."
                    className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Register As</label>
                  <select
                    {...register('role')}
                    className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public User</option>
                    <option value="doctor">Doctor</option>
                    <option value="student">Medical Student</option>
                  </select>
                  {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
                </div>

                {(selectedRole === 'doctor' || selectedRole === 'student') && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                      <input
                        {...register('state')}
                        type="text"
                        placeholder="State"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">District</label>
                      <input
                        {...register('district')}
                        type="text"
                        placeholder="District"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                      <input
                        {...register('city')}
                        type="text"
                        placeholder="City"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                    </div>
                  </>
                )}

                {selectedRole === 'doctor' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Qualification</label>
                      <input
                        {...register('qualification')}
                        type="text"
                        placeholder="MBBS, MD..."
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.qualification && (
                        <p className="mt-1 text-xs text-red-500">{errors.qualification.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Specialization</label>
                      <input
                        {...register('specialization')}
                        type="text"
                        placeholder="Cardiology..."
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.specialization && (
                        <p className="mt-1 text-xs text-red-500">{errors.specialization.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Experience</label>
                      <input
                        {...register('experience')}
                        type="text"
                        placeholder="8 years"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.experience && <p className="mt-1 text-xs text-red-500">{errors.experience.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Clinic Name</label>
                      <input
                        {...register('clinicName')}
                        type="text"
                        placeholder="Clinic / Hospital name"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.clinicName && <p className="mt-1 text-xs text-red-500">{errors.clinicName.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          {...register('showPhone')}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show my phone to verified users
                      </label>
                    </div>
                  </>
                )}

                {selectedRole === 'student' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Course</label>
                      <input
                        {...register('course')}
                        type="text"
                        placeholder="MBBS / BDS / MD..."
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.course && <p className="mt-1 text-xs text-red-500">{errors.course.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">College</label>
                      <input
                        {...register('college')}
                        type="text"
                        placeholder="College name"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.college && <p className="mt-1 text-xs text-red-500">{errors.college.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                      <input
                        {...register('academicYear')}
                        type="text"
                        placeholder="1st / 2nd / Final"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.academicYear && (
                        <p className="mt-1 text-xs text-red-500">{errors.academicYear.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Gotra (Optional)</label>
                      <input
                        {...register('gotra')}
                        type="text"
                        placeholder="Optional"
                        className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.gotra && <p className="mt-1 text-xs text-red-500">{errors.gotra.message}</p>}
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="you@example.com"
                      className="block w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('password')}
                      type="password"
                      placeholder="Min 8 characters"
                      className="block w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('confirmPassword')}
                      type="password"
                      placeholder="Confirm password"
                      className="block w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Register
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500">
                Status will be set to Pending. Admin verification is required for full access and doctor contact
                details.
              </p>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
