import React from 'react'

export default function OpenSeoPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">OpenSEO Onboarding Chat</h1>
      <div className="bg-white rounded shadow p-4 min-h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 border-b border-gray-100 pb-4">
          <p className="text-gray-500 italic text-center mt-10">Chat interface will be mounted here.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="E.g., I need a keyword strategy for my e-commerce site..." 
            className="flex-1 border rounded px-3 py-2"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
        </div>
      </div>
    </div>
  )
}
