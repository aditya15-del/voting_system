'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Contestant {
    id: string
    name: string
    participation_id: string
}

interface AppControl {
    current_stage: string
    active_contestant_id: string | null
}

export default function VotingPage() {
    const [control, setControl] = useState<AppControl | null>(null)
    const [activeContestant, setActiveContestant] = useState<Contestant | null>(null)
    const [deviceID, setDeviceID] = useState<string>('')
    const [score, setScore] = useState<number>(5)
    const [hasVoted, setHasVoted] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // 1. Initialize Fingerprint
        const setFingerprint = async () => {
            const fp = await FingerprintJS.load()
            const result = await fp.get()
            setDeviceID(result.visitorId)
        }
        setFingerprint()

        // 2. Initial Data Fetch
        fetchInitialState()

        // 3. Subscribe to App Control
        const channel = supabase
            .channel('audience_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_control' }, (payload) => {
                const newControl = payload.new as AppControl
                setControl(newControl)
                if (newControl.active_contestant_id) {
                    fetchContestant(newControl.active_contestant_id)
                } else {
                    setActiveContestant(null)
                    setHasVoted(false)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Check if voted whenever contestant changes
    useEffect(() => {
        if (deviceID && activeContestant) {
            checkVoteStatus()
        }
    }, [deviceID, activeContestant])

    async function fetchInitialState() {
        const { data: ctrlData } = await supabase.from('app_control').select('*').single()
        if (ctrlData) {
            setControl(ctrlData)
            if (ctrlData.active_contestant_id) {
                await fetchContestant(ctrlData.active_contestant_id)
            }
        }
        setLoading(false)
    }

    async function fetchContestant(id: string) {
        const { data } = await supabase.from('contestants').select('*').eq('id', id).single()
        setActiveContestant(data)
        setScore(5) // Reset score slider
    }

    async function checkVoteStatus() {
        if (!activeContestant || !deviceID) return
        const { data } = await supabase
            .from('votes')
            .select('id')
            .eq('contestant_id', activeContestant.id)
            .eq('device_id', deviceID)
            .single()

        setHasVoted(!!data)
    }

    async function submitVote() {
        if (!activeContestant || !deviceID || hasVoted || submitting) return
        setSubmitting(true)

        const { error } = await supabase.from('votes').insert([
            { contestant_id: activeContestant.id, device_id: deviceID, score }
        ])

        if (!error) {
            setHasVoted(true)
        }
        setSubmitting(false)
    }

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Initializing...</div>

    // STATES
    const isVotingOpen = control?.current_stage === 'Voting' && activeContestant

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
            <AnimatePresence mode="wait">
                {!isVotingOpen ? (
                    <motion.div
                        key="waiting"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="text-center space-y-6 max-w-sm"
                    >
                        <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                            <Clock className="w-10 h-10 text-emerald-500 animate-pulse" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Stay Tuned!</h1>
                        <p className="text-slate-400 leading-relaxed">
                            Voting is currently closed. We'll refresh automatically when the next performance begins.
                        </p>
                        <div className="pt-8 flex flex-col items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600">Current Event State</span>
                            <span className="bg-slate-900 px-4 py-1 rounded-full text-xs border border-slate-800 text-emerald-400 font-bold uppercase tracking-wider">
                                {control?.current_stage || 'Preparing'}
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="voting"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md space-y-8"
                    >
                        {/* Contestant Header */}
                        <div className="text-center space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Currently Performing</span>
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter">{activeContestant.name}</h2>
                            <p className="text-slate-500 font-mono tracking-widest">{activeContestant.participation_id}</p>
                        </div>

                        {hasVoted ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl text-center space-y-4"
                            >
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-10 h-10 text-slate-950" />
                                </div>
                                <h3 className="text-2xl font-bold text-emerald-400">Vote Recorded!</h3>
                                <p className="text-slate-400 text-sm">Thank you for supporting this performer. Your score has been synced to the leaderboard.</p>
                            </motion.div>
                        ) : (
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-10">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-bold uppercase tracking-widest text-slate-500">Your Score</label>
                                        <span className="text-6xl font-black text-white tabular-nums">{score}</span>
                                    </div>

                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="0.5"
                                        value={score}
                                        onChange={(e) => setScore(parseFloat(e.target.value))}
                                        className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />

                                    <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">
                                        <span>Needs Work</span>
                                        <span>Excellent</span>
                                    </div>
                                </div>

                                <button
                                    onClick={submitVote}
                                    disabled={submitting}
                                    className="w-full py-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Vote'}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 text-slate-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-[10px] uppercase font-bold tracking-tight">One vote per device strictly enforced</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Decor */}
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        </div>
    )
}
