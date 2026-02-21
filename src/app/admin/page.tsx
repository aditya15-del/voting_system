'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Trophy, Play, Square, UserPlus, Trash2, BarChart3, ChevronRight, LogOut, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Contestant {
    id: string
    name: string
    participation_id: string
    performance_order: number
    category: 'Creator' | 'Performer'
}

interface AppControl {
    current_stage: string
    active_contestant_id: string | null
    reveal_step: number
    reveal_category: 'Performer' | 'Creator'
}

const AUTHORIZED_EMAILS = [
    'genaivitbcommunity@gmail.com',
    'aditya.24bce10533@vitbhopal.ac.in'
]

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState('')

    const [contestants, setContestants] = useState<Contestant[]>([])
    const [control, setControl] = useState<AppControl | null>(null)
    const [newName, setNewName] = useState('')
    const [newID, setNewID] = useState('')
    const [newCategory, setNewCategory] = useState<'Creator' | 'Performer'>('Performer')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkUser()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            validateSession(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession()
        validateSession(session)
    }

    async function validateSession(session: any) {
        if (session?.user?.email && AUTHORIZED_EMAILS.includes(session.user.email)) {
            setUser(session.user)
            fetchData()
        } else {
            if (session) await supabase.auth.signOut()
            setUser(null)
        }
        setAuthLoading(false)
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoginError('')
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setLoginError(error.message)
        } else if (data.user?.email && !AUTHORIZED_EMAILS.includes(data.user.email)) {
            setLoginError('Access denied. This email is not authorized.')
            await supabase.auth.signOut()
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        setUser(null)
    }

    useEffect(() => {
        if (!user) return

        const controlSub = supabase
            .channel('admin_control')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_control' }, (payload) => {
                setControl(payload.new as AppControl)
            })
            .subscribe()

        const contestantsSub = supabase
            .channel('admin_contestants')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants' }, () => {
                fetchData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(controlSub)
            supabase.removeChannel(contestantsSub)
        }
    }, [user])

    async function fetchData() {
        const { data: cData } = await supabase.from('contestants').select('*').order('performance_order', { ascending: true })
        const { data: ctrlData } = await supabase.from('app_control').select('*').single()

        if (cData) setContestants(cData as Contestant[])
        if (ctrlData) setControl(ctrlData as AppControl)
        setLoading(false)
    }

    // ... (rest of the functions remain same)
    async function addContestant(e: React.FormEvent) {
        e.preventDefault()
        if (!newName || !newID) return
        const { error } = await supabase.from('contestants').insert([
            { name: newName, participation_id: newID, category: newCategory, performance_order: contestants.length + 1 }
        ])
        if (!error) {
            setNewName('')
            setNewID('')
            fetchData()
        } else {
            alert('Failed to add contestant: ' + error.message)
        }
    }

    async function deleteContestant(id: string) {
        const { error } = await supabase.from('contestants').delete().eq('id', id)
        if (error) alert('Failed to delete: ' + error.message)
        fetchData()
    }

    async function updateStage(stage: string, activeId: string | null = null) {
        const { error } = await supabase.from('app_control').update({
            current_stage: stage,
            active_contestant_id: activeId,
            reveal_step: 0
        }).eq('id', 1)
        if (error) alert('Failed to update stage: ' + error.message)
    }

    async function updateRevealStep(step: number, category: string | null = null) {
        const updates: any = { reveal_step: step }
        if (category) updates.reveal_category = category
        const { error } = await supabase.from('app_control').update(updates).eq('id', 1)
        if (error) alert('Failed to update reveal step: ' + error.message)
    }

    async function resetVotes() {
        if (confirm('Are you sure you want to delete ALL votes?')) {
            const { error } = await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
            if (error) alert('Failed to reset votes: ' + error.message)
            fetchData()
        }
    }

    const [stats, setStats] = useState({
        performerVotes: 0,
        creatorVotes: 0,
        topPerformer: '---',
        topCreator: '---'
    })

    useEffect(() => {
        if (!user) return
        const fetchStats = async () => {
            const { data: votes } = await supabase.from('votes').select('contestant_id, score')
            if (!votes) return

            const totals: Record<string, { sum: number, count: number }> = {}
            votes.forEach(v => {
                if (!totals[v.contestant_id]) totals[v.contestant_id] = { sum: 0, count: 0 }
                totals[v.contestant_id].sum += v.score
                totals[v.contestant_id].count += 1
            })

            let bestPerformerAvg = 0
            let topPerformerName = '---'
            let bestCreatorAvg = 0
            let topCreatorName = '---'
            let pVotes = 0
            let cVotes = 0

            Object.entries(totals).forEach(([id, data]) => {
                const c = contestants.find(x => x.id === id)
                if (!c) return

                const avg = data.sum / data.count
                if (c.category === 'Performer') {
                    pVotes += data.count
                    if (avg > bestPerformerAvg) {
                        bestPerformerAvg = avg
                        topPerformerName = c.name
                    }
                } else {
                    cVotes += data.count
                    if (avg > bestCreatorAvg) {
                        bestCreatorAvg = avg
                        topCreatorName = c.name
                    }
                }
            })

            setStats({
                performerVotes: pVotes,
                creatorVotes: cVotes,
                topPerformer: topPerformerName,
                topCreator: topCreatorName
            })
        }

        fetchStats()

        const voteSub = supabase.channel('stats_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchStats)
            .subscribe()

        return () => { supabase.removeChannel(voteSub) }
    }, [contestants, user])

    if (authLoading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans tracking-[0.5em] uppercase">Checking Permissions...</div>

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-3xl shadow-2xl"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <Lock className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Admin Gate</h1>
                        <p className="text-slate-500 text-sm mt-1">Authorized personnel only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                required
                            />
                        </div>

                        {loginError && (
                            <p className="text-red-400 text-xs font-bold bg-red-400/10 p-3 rounded-lg border border-red-400/20">{loginError}</p>
                        )}

                        <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95 uppercase tracking-widest text-sm">
                            Access Dashboard
                        </button>
                    </form>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent text-left">
                        Admin Control Center
                    </h1>
                    <p className="text-slate-400 mt-2">Authenticated as <span className="text-emerald-400 font-mono">{user.email}</span></p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${control?.current_stage === 'Voting' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-slate-500'}`} />
                        <div>
                            <span className="text-xs uppercase tracking-widest text-slate-500 block">Current Status</span>
                            <span className="font-semibold text-lg">{control?.current_stage}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleLogout}
                            className="p-3 bg-slate-900/50 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                        <button
                            onClick={resetVotes}
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all"
                            title="Reset All Votes"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Add & List Contestants */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Add Contestant Form */}
                    <section className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-400" />
                            Register Contestant
                        </h2>
                        <form onSubmit={addContestant} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                />
                                <input
                                    type="text"
                                    placeholder="ID (e.g. #001)"
                                    value={newID}
                                    onChange={(e) => setNewID(e.target.value)}
                                    className="bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <div className="flex gap-4 font-sans">
                                {(['Performer', 'Creator'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setNewCategory(cat)}
                                        className={`flex-1 py-3 rounded-xl border transition-all font-bold ${newCategory === cat ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-slate-950/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                <button className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    Add Contestant
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="space-y-8">
                        {['Performer', 'Creator'].map(category => {
                            const filtered = contestants.filter(c => c.category === category)
                            return (
                                <div key={category} className="space-y-4">
                                    <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-400">
                                        <Trophy className={`w-5 h-5 ${category === 'Creator' ? 'text-indigo-400' : 'text-emerald-400'}`} />
                                        {category}s ({filtered.length})
                                    </h2>
                                    <AnimatePresence mode="popLayout">
                                        {filtered.map((c) => (
                                            <motion.div
                                                key={c.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className={`group relative bg-slate-900/40 border ${control?.active_contestant_id === c.id ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800'} p-4 rounded-2xl flex items-center justify-between backdrop-blur-md transition-all mb-3`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-400">
                                                        {c.performance_order}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-slate-100 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{c.name}</h3>
                                                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">{c.participation_id}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {control?.active_contestant_id === c.id && control?.current_stage === 'Voting' ? (
                                                        <button
                                                            onClick={() => updateStage('Break', null)}
                                                            className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-500 hover:text-white transition-all font-sans"
                                                        >
                                                            <Square className="w-4 h-4" /> Stop Voting
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateStage('Voting', c.id)}
                                                            className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-500 hover:text-white transition-all shadow-sm font-sans"
                                                        >
                                                            <Play className="w-4 h-4 ml-0.5" /> Start Voting
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteContestant(c.id)}
                                                        className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {filtered.length === 0 && (
                                            <div className="text-center py-6 bg-slate-900/20 rounded-2xl border border-slate-800/50 text-slate-600 italic">
                                                No {category.toLowerCase()}s added yet
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </section>
                </div>

                {/* Right Column: Global Actions */}
                <div className="space-y-8">
                    <section className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl h-fit">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-cyan-400" />
                            Stage Control
                        </h2>
                        <div className="grid gap-3 font-sans">
                            <button
                                onClick={() => updateStage('Waiting', null)}
                                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${control?.current_stage === 'Waiting' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                            >
                                Reset to Waiting Screen <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => updateStage('Break', null)}
                                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${control?.current_stage === 'Break' ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                            >
                                Intermission / Break <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => updateStage('Reveal', null)}
                                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${control?.current_stage === 'Reveal' ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                            >
                                Enter Reveal Mode <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </section>

                    {/* Staged Reveal Controls */}
                    <AnimatePresence>
                        {control?.current_stage === 'Reveal' && (
                            <motion.section
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-3xl backdrop-blur-xl h-fit"
                            >
                                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-purple-400">
                                    <Trophy className="w-5 h-5" />
                                    Staged Reveal
                                </h2>
                                <div className="grid grid-cols-2 gap-3 font-sans">
                                    <div className="col-span-2 mb-2">
                                        <p className="text-[10px] uppercase tracking-widest text-purple-400 mb-2 font-bold">Category to reveal</p>
                                        <div className="flex gap-2">
                                            {(['Performer', 'Creator'] as const).map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => updateRevealStep(0, cat)}
                                                    className={`flex-1 py-1 px-3 rounded-lg border text-xs font-bold transition-all ${control.reveal_category === cat ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}
                                                >
                                                    {cat}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {[1, 2, 3, 4].map(s => {
                                        const labels = ["3rd Place", "2nd Place", "Winner!", "Full Table"]
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => updateRevealStep(s)}
                                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${control.reveal_step === s ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}
                                            >
                                                {labels[s - 1]}
                                            </button>
                                        )
                                    })}
                                    <button
                                        onClick={() => updateRevealStep(0)}
                                        className="col-span-2 p-3 rounded-xl border border-slate-800 text-xs text-slate-600 hover:bg-slate-800"
                                    >
                                        Hide All
                                    </button>
                                </div>
                            </motion.section>
                        )}
                    </AnimatePresence>

                    <section className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 rounded-3xl backdrop-blur-xl h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-300">
                            <BarChart3 className="w-5 h-5" /> Analytics Hub
                        </h2>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest px-1">Performers</h3>
                                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/10">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Votes</p>
                                    <p className="text-3xl font-mono text-emerald-400">{stats.performerVotes}</p>
                                </div>
                                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/10">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Top Averaged</p>
                                    <p className="text-lg font-bold text-white truncate text-left">{stats.topPerformer}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest px-1">Creators</h3>
                                <div className="bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/10">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Votes</p>
                                    <p className="text-3xl font-mono text-indigo-400">{stats.creatorVotes}</p>
                                </div>
                                <div className="bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/10">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Top Averaged</p>
                                    <p className="text-lg font-bold text-white truncate text-left">{stats.topCreator}</p>
                                </div>
                            </div>

                            <p className="text-[10px] text-zinc-600 text-center uppercase tracking-tighter pt-2">Real-time sync enabled</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
