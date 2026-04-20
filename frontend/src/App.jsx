import { useState } from "react";
import UploadComponent from "./compenents/UploadComponent";

function App() {
  const [status, setStatus] = useState("No request yet");
  const [responseData, setResponseData] = useState(null);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">VERIDEX Upload</h1>
        <p className="mt-2 text-slate-600">Send video, image, or text files to the analyze endpoint.</p>

        <div className="mt-6">
          <UploadComponent
            onUploadResult={(data) => {
              setResponseData(data);
              setStatus("Upload completed");
            }}
            onUploadError={(message) => {
              setResponseData(null);
              setStatus(message);
            }}
          />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Status</p>
          <p className="mt-1 text-sm text-slate-600">{status}</p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Response</p>
          <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {responseData ? JSON.stringify(responseData, null, 2) : "No response yet"}
          </pre>
        </div>
      </div>
    </main>
  );
}

export default App;
