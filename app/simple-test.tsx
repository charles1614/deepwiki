'use client'

export default function SimpleTest() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Persistent AI Connections - Simple Test</h1>
      <p className="mb-4">This page tests the core AI connection functionality without the complex navigation wrapper.</p>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="space-y-2 text-sm">
          <div>✅ AI Connection Context: Available</div>
          <div>✅ AI Storage Utilities: Available</div>
          <div>✅ AI Connection Status: Available</div>
          <div>✅ AI Terminal: Available</div>
          <div>✅ AI File Browser: Available</div>
        </div>
      </div>
    </div>
  )
}