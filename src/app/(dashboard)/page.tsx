export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome to AI SaaS Platform</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Feature 1</h3>
          <p className="text-gray-600">Your first service feature goes here</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Feature 2</h3>
          <p className="text-gray-600">Your second service feature goes here</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Feature 3</h3>
          <p className="text-gray-600">Your third service feature goes here</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">AI Chat Assistant</h2>
        <p className="text-gray-600 mb-4">
          Click the "AI Chat" button in the header to open the AI assistant panel.
          Ask questions, get help, or brainstorm ideas!
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>Real-time AI responses</li>
          <li>Context-aware conversations</li>
          <li>Integrated with your workspace</li>
        </ul>
      </div>
    </div>
  );
}
