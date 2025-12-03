export default function Dashboard() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-[#1a1f2b] border border-gray-700">Widget</div>
        <div className="p-4 rounded-md bg-[#1a1f2b] border border-gray-700">Widget</div>
        <div className="p-4 rounded-md bg-[#1a1f2b] border border-gray-700">Widget</div>
      </div>
    </section>
  )
}
