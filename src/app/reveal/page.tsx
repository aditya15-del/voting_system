'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Crown, Star } from 'lucide-react'

interface Result {
    id: string
    name: string
    participation_id: string
    avg_score: number
    vote_count: number
    category: 'Creator' | 'Performer'
}

interface AppControl {
    current_stage: string
    reveal_step: number
    reveal_category: 'Performer' | 'Creator'
}

export default function RevealPage() {
    const [control, setControl] = useState<AppControl | null>(null)
    const [results, setResults] = useState<Result[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchState()

        const channel = supabase
            .channel('reveal_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_control' }, async (payload) => {
                const newControl = payload.new as AppControl
                setControl(newControl)
                if (newControl.current_stage === 'Reveal') {
                    await calculateResults()
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchState() {
        const { data } = await supabase.from('app_control').select('*').single()
        if (data) {
            setControl(data)
            if (data.current_stage === 'Reveal') {
                await calculateResults()
            }
        }
        setLoading(false)
    }

    async function calculateResults() {
        const { data: contestants } = await supabase.from('contestants').select('*')
        const { data: votes } = await supabase.from('votes').select('*')

        if (!contestants || !votes) return

        const calculated = contestants.map(c => {
            const cVotes = votes.filter(v => v.contestant_id === c.id)
            const avg = cVotes.length > 0 ? cVotes.reduce((acc, curr) => acc + curr.score, 0) / cVotes.length : 0
            return {
                id: c.id,
                name: c.name,
                participation_id: c.participation_id,
                category: c.category as 'Creator' | 'Performer',
                avg_score: parseFloat(avg.toFixed(1)),
                vote_count: cVotes.length
            }
        }).sort((a, b) => b.avg_score - a.avg_score)

        setResults(calculated)
    }

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans uppercase tracking-[0.5em]">Loading Ceremony...</div>

    // STAGES
    const isRevealMode = control?.current_stage === 'Reveal'
    const step = control?.reveal_step || 0

    // Filter results for current category
    const filteredResults = results.filter(r => r.category === control?.reveal_category)

    return (
        <div className="min-h-screen bg-[#050510] text-white overflow-x-hidden flex flex-col items-center justify-center p-4 md:p-12 font-sans relative">

            {/* Background Particles/Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-colors duration-1000 ${control?.reveal_category === 'Creator' ? 'bg-indigo-600/20' : 'bg-purple-600/20'}`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-colors duration-1000 ${control?.reveal_category === 'Creator' ? 'bg-blue-600/10' : 'bg-emerald-600/10'}`} />
            </div>

            <AnimatePresence mode="wait">
                {!isRevealMode ? (
                    <motion.div
                        key="pre-reveal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center space-y-8"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="w-64 h-64 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Star className="w-16 h-16 text-yellow-500 fill-yellow-500 animate-pulse shadow-[0_0_50px_rgba(234,179,8,0.3)]" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-[0.1em] md:tracking-[0.2em] bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent px-4">
                            Grand Result <span className="text-yellow-500">Ceremony</span>
                        </h1>
                        <p className="text-sm md:text-xl text-white/40 tracking-[0.2em] md:tracking-[0.5em] font-mono uppercase px-4">Waiting for Admin to trigger reveal</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="reveal-active"
                        className="w-full max-w-6xl space-y-24 text-center"
                    >
                        <div className="space-y-4 px-4 w-full">
                            <h2 className="text-xl md:text-2xl font-bold tracking-[0.2em] md:tracking-[1em] text-yellow-500/50 uppercase break-words leading-relaxed">
                                {control.reveal_category} Leaderboard
                            </h2>
                            <div className="h-1 w-24 md:w-48 bg-yellow-500 mx-auto rounded-full" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-end min-h-fit md:min-h-[400px] py-12">

                            {/* 2nd Place */}
                            <div className="flex flex-col items-center gap-6">
                                <AnimatePresence>
                                    {step >= 2 && filteredResults[1] && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0, y: 50 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="space-y-4"
                                        >
                                            <div className="w-24 h-24 bg-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(148,163,184,0.3)] rotate-3">
                                                <Medal className="w-12 h-12 text-slate-900" />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-bold uppercase">{filteredResults[1].name}</h3>
                                                <p className="text-slate-500 font-mono tracking-widest">{filteredResults[1].participation_id}</p>
                                            </div>
                                            <div className="text-4xl font-black text-slate-400 font-mono">{filteredResults[1].avg_score}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="w-full h-48 bg-slate-900/50 border-t-2 border-slate-700/50 rounded-t-3xl backdrop-blur-md" />
                            </div>

                            {/* 1st Place */}
                            <div className="flex flex-col items-center gap-6">
                                <AnimatePresence>
                                    {step >= 3 && filteredResults[0] && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0, y: 50 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="space-y-4 mb-2"
                                        >
                                            <div className="w-32 h-32 bg-yellow-500 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(234,179,8,0.5)] -rotate-3 relative">
                                                <Crown className="w-20 h-20 text-slate-900" />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className="absolute -inset-4 bg-yellow-500/20 blur-xl -z-10 rounded-full"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black uppercase text-yellow-500 tracking-tight">{filteredResults[0].name}</h3>
                                                <p className="text-yellow-500/50 font-mono tracking-widest">{filteredResults[0].participation_id}</p>
                                            </div>
                                            <div className="text-7xl font-black text-white font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{filteredResults[0].avg_score}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="w-full h-72 bg-yellow-500/10 border-t-4 border-yellow-500/50 rounded-t-[3rem] backdrop-blur-xl relative">
                                    <div className="absolute top-8 left-1/2 -translate-x-1/2 font-black text-9xl text-yellow-500/10">1</div>
                                </div>
                            </div>

                            {/* 3rd Place */}
                            <div className="flex flex-col items-center gap-6">
                                <AnimatePresence>
                                    {step >= 1 && filteredResults[2] && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0, y: 50 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="space-y-4"
                                        >
                                            <div className="w-20 h-20 bg-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(180,83,9,0.3)] -rotate-6">
                                                <Trophy className="w-10 h-10 text-slate-950" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold uppercase">{filteredResults[2].name}</h3>
                                                <p className="text-slate-500 font-mono tracking-widest">{filteredResults[2].participation_id}</p>
                                            </div>
                                            <div className="text-3xl font-black text-amber-700 font-mono">{filteredResults[2].avg_score}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="w-full h-32 bg-slate-900/50 border-t-2 border-slate-800 rounded-t-3xl backdrop-blur-md" />
                            </div>

                        </div>

                        {/* FULL LEADERBOARD REVEAL */}
                        {step >= 4 && (
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-4xl mx-auto bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[600px] md:min-w-0">
                                        <thead className="text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] text-white/40 border-b border-white/5">
                                            <tr>
                                                <th className="py-4 text-left px-4 md:px-6">Rank</th>
                                                <th className="py-4 text-left px-4 md:px-6">{control.reveal_category}</th>
                                                <th className="py-4 text-center px-4 md:px-6">Avg Score</th>
                                                <th className="py-4 text-right px-4 md:px-6">Votes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredResults.map((r, i) => (
                                                <tr key={r.id} className={`${i < 3 ? 'text-yellow-500/80 font-bold' : 'text-white/60'}`}>
                                                    <td className="py-6 px-6 text-left font-mono">#{i + 1}</td>
                                                    <td className="py-6 px-6 text-left uppercase tracking-tight">{r.name}</td>
                                                    <td className="py-6 px-6 text-center font-black text-xl">{r.avg_score}</td>
                                                    <td className="py-6 px-6 text-right font-mono text-sm opacity-40">{r.vote_count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
