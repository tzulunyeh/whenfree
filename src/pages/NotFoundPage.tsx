import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-gray-700">找不到頁面</h1>
      <Link to="/" className="text-emerald-600 underline">回首頁</Link>
    </div>
  )
}
