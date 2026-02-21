'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Vote, ShieldCheck, Presentation, Star } from 'lucide-react'

export default function Home() {
  const cards = [
    {
      title: "Audience Voting",
      description: "Cast your vote for the current performer in real-time.",
      href: "/vote",
      icon: Vote,
      color: "from-purple-500 to-blue-500",
      delay: 0.1
    },
    {
      title: "Public Reveal",
      description: "Cinematic winners reveal sequence for the big screen.",
      href: "/reveal",
      icon: Presentation,
      color: "from-amber-500 to-orange-500",
      delay: 0.2
    },
    {
      title: "Admin Dashboard",
      description: "Management hub for show sequence and live controls.",
      href: "/admin",
      icon: ShieldCheck,
      color: "from-emerald-500 to-teal-500",
      delay: 0.3
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-6 py-24 flex flex-col items-center">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-sm mb-6">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Live Talent Show Voting System</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent text-center">
            The Stage is Set.
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
            A real-time, cinematic experience for talent shows. Secure, fair, and designed for maximum engagement.
          </p>
        </motion.div>

        {/* Navigation Grid */}
        <div className="grid md:grid-cols-3 gap-6 w-full max-w-6xl">
          {cards.map((card) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay }}
            >
              <Link href={card.href} className="group relative block h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-2xl`} />

                <div className="relative h-full bg-zinc-900/40 border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300 backdrop-blur-sm flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-6 shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{card.title}</h2>
                  <p className="text-zinc-500 leading-relaxed">
                    {card.description}
                  </p>

                  <div className="mt-auto pt-8">
                    <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors duration-300 flex items-center gap-2">
                      Enter Section
                      <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center text-zinc-600 text-sm"
        >
          <p>Powered by Next.js & Supabase Realtime</p>
        </motion.div>
      </main>
    </div>
  )
}
