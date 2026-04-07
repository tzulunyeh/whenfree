import { useState } from 'react'
import toast from 'react-hot-toast'
import { nanoid } from 'nanoid'
import { supabase } from '../../lib/supabase'
import type { Participant, ParticipantSession } from '../../lib/types'
import Avatar from '../ui/Avatar'

interface Props {
  eventId: string
  eventName: string
  participants: Participant[]
  onLogin: (session: ParticipantSession) => void
}

export default function ParticipantLogin({ eventId, eventName, participants, onLogin }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewSeed] = useState(() => nanoid(8))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return toast.error('請填入名字')

    setLoading(true)
    try {
      const { data: existing, error: existingError } = await supabase
        .from('participants')
        .select('id, avatar_seed')
        .eq('event_id', eventId)
        .eq('name', trimmed)
        .maybeSingle()
      if (existingError) throw existingError

      if (existing) {
        const existingParticipant = existing as { id: string; avatar_seed: string }
        onLogin({ participantId: existingParticipant.id, name: trimmed, avatarSeed: existingParticipant.avatar_seed })
        toast.success(`歡迎回來，${trimmed}！`)
        return
      }

      const avatarSeed = nanoid(8)
      const { data, error } = await supabase
        .from('participants')
        .insert({ event_id: eventId, name: trimmed, avatar_seed: avatarSeed })
        .select('id, avatar_seed')
        .single()

      if (error) {
        // Unique constraint violation = name taken (race condition)
        if (error.code === '23505') {
          const { data: conflicted, error: conflictError } = await supabase
            .from('participants')
            .select('id, avatar_seed')
            .eq('event_id', eventId)
            .eq('name', trimmed)
            .maybeSingle()
          if (conflictError) throw conflictError

          const conflictedParticipant = conflicted as { id: string; avatar_seed: string } | null
          if (conflictedParticipant) {
            onLogin({
              participantId: conflictedParticipant.id,
              name: trimmed,
              avatarSeed: conflictedParticipant.avatar_seed,
            })
            toast.success(`歡迎回來，${trimmed}！`)
          } else {
            toast.error('登入失敗，請稍後再試')
          }
        } else {
          throw error
        }
        return
      }

      if (!data) throw new Error('Participant insert returned no data')
      const inserted = data as { id: string; avatar_seed: string }
      onLogin({ participantId: inserted.id, name: trimmed, avatarSeed: inserted.avatar_seed })
    } catch (err) {
      console.error(err)
      toast.error('登入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{eventName}</h2>
          <Avatar seed={previewSeed} size={64} className="mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-800">填寫你的名字</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字"
            maxLength={30}
            autoFocus
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? '進入中…' : '進入活動'}
          </button>
        </form>

        {participants.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">已填寫：</p>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2 py-1">
                  <Avatar seed={p.avatar_seed} size={20} />
                  <span className="text-xs text-gray-600">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
