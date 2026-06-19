import { Link } from 'react-router-dom'
import { Ghost, Zap, Lock, TrendingUp, ChevronRight } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Ghost className="w-6 h-6 text-ghost-400" />
          <span className="font-bold text-lg text-white">Meeting Ghost</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-ghost-900/40 border border-ghost-800 rounded-full px-4 py-1.5 text-ghost-300 text-sm mb-8">
          <Ghost className="w-4 h-4" />
          Private coaching for every meeting
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
          Your meeting had{' '}
          <span className="text-ghost-400">5 moments</span>{' '}
          you missed.
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Meeting Ghost watches every conversation and tells you exactly what you should have said — and when. Private, personalized, and brutally honest.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base px-6 py-3">
            Start for free <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-6 py-3">
            Sign in
          </Link>
        </div>
      </section>

      {/* Sample report preview */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-mono mb-6">
            <Ghost className="w-4 h-4 text-ghost-400" />
            Ghost Report — Sarah Chen — Q4 Roadmap Review
          </div>

          <div className="border border-red-800 bg-red-950/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-red">🔴 Missed Defense</span>
              <span className="text-gray-500 text-sm font-mono">9:14</span>
            </div>
            <p className="text-gray-200 text-sm mb-3">
              When Marcus said "this feature isn't a priority," you moved on. You had the Q2 user research that directly contradicted this. You never used it.
            </p>
            <div className="bg-gray-800 rounded-lg p-3 border-l-2 border-ghost-500">
              <p className="text-ghost-300 text-sm italic">
                "Actually, our Q2 research showed 67% of churned users cited this exact gap — I can pull that up right now."
              </p>
            </div>
          </div>

          <div className="border border-yellow-800 bg-yellow-950/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-yellow">🟡 Unclaimed Idea</span>
              <span className="text-gray-500 text-sm font-mono">23:41</span>
            </div>
            <p className="text-gray-200 text-sm mb-3">
              You proposed the phased rollout in the pre-meeting Slack. In the room, David restated it and received the credit. You said nothing.
            </p>
            <div className="bg-gray-800 rounded-lg p-3 border-l-2 border-ghost-500">
              <p className="text-ghost-300 text-sm italic">
                "Yes, that's the approach I outlined earlier — glad it resonates. To build on it..."
              </p>
            </div>
          </div>

          <div className="border border-green-800 bg-green-950/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-green">🟢 Missed Opportunity</span>
              <span className="text-gray-500 text-sm font-mono">31:05</span>
            </div>
            <p className="text-gray-200 text-sm">
              The budget question was left open-ended. You're the only person in that room with authority to close it, and the moment passed. It will now drag into a follow-up meeting.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Why Meeting Ghost works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: 'Private briefs', desc: 'Your goals are secret. Ghost knows what you wanted — nobody else does.' },
              { icon: Zap, title: 'Timestamped moments', desc: 'Specific and actionable. Not vague feedback — the exact second you could have changed the room.' },
              { icon: Ghost, title: 'Better phrasing', desc: 'Shows exactly what to say, not just what you missed.' },
              { icon: TrendingUp, title: 'Pattern reports', desc: '"You consistently back down when interrupted by senior staff." Over time, Ghost sees your habits.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card text-center">
                <Icon className="w-8 h-8 text-ghost-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Start your first Ghost session</h2>
        <p className="text-gray-400 mb-8">Upload a transcript. Get your private debrief in seconds.</p>
        <Link to="/register" className="btn-primary text-base px-8 py-3">
          Get started free
        </Link>
      </section>

      <footer className="border-t border-gray-800 text-center py-6 text-gray-600 text-sm">
        Meeting Ghost © 2025 — Your reports are private. Always.
      </footer>
    </div>
  )
}
