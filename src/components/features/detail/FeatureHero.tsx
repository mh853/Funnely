'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { RocketLaunchIcon, PlayCircleIcon } from '@heroicons/react/24/outline'
import FeatureIcon from '../shared/FeatureIcon'
import ProBadge from '../shared/ProBadge'
import { IconName } from '@/utils/iconMap'

interface FeatureHeroProps {
  icon: IconName
  iconGradient: string
  title: string
  subtitle: string
  isPro?: boolean
}

export default function FeatureHero({ icon, iconGradient, title, subtitle, isPro = false }: FeatureHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-32 pb-20 sm:pt-40 sm:pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors">
                홈
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li>
              <Link href="/#features" className="hover:text-blue-600 transition-colors">
                기능
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-900 font-medium">{title}</li>
          </ol>
        </motion.nav>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative inline-block mb-6">
              <FeatureIcon Icon={icon} gradient={iconGradient} size="lg" />
              {isPro && <ProBadge />}
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              {title}
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl">
              {subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/signup?plan=pro&trial=true"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <RocketLaunchIcon className="h-5 w-5" />
                무료로 시작하기
              </Link>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-600 transition-all">
                <PlayCircleIcon className="h-5 w-5" />
                데모 보기
              </button>
            </div>
          </motion.div>

          {/* Right: Feature Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl bg-white/80 backdrop-blur-sm p-2 shadow-2xl ring-1 ring-gray-900/10">
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <FeatureIcon Icon={icon} gradient={iconGradient} size="lg" />
                  <p className="text-gray-600 font-medium mt-4">기능 스크린샷</p>
                  <p className="text-sm text-gray-500 mt-1">추후 추가 예정</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
