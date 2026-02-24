import React, { useMemo, useState } from "react";
import Graph3DView from "./components/Graph3DView";
import { buildGraphFromAnalysis } from "./utils/graphBuilder";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getApiBase = () => {
  const configured = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const trimmed = configured.replace(/\/+$/, "");
  return trimmed.endsWith("/analyze")
    ? trimmed.replace(/\/analyze$/, "")
    : trimmed;
};

function App() {
  const apiBase = useMemo(() => getApiBase(), []);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);

  const graphData = useMemo(
    () => buildGraphFromAnalysis(currentAnalysis),
    [currentAnalysis],
  );

  const handleFileSelect = (file) => {
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(file);
      setError("");
      setNotice("");
    } else {
      setError("Please select a valid PDF file");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const showError = (message) => {
    setError(message);
    setNotice("");
    setShowResults(false);
    setIsAnalyzing(false);
  };

  const displayResults = (payload, status) => {
    setCurrentAnalysis(payload.analysis);
    setSelectedNode(null);
    setShowResults(true);
    setError("");
    setNotice(
      status === "partial"
        ? "Partial result shown: Gemini quota was hit, so fallback analysis is displayed."
        : payload.cached
          ? "Loaded cached analysis for this PDF."
          : "Analysis completed successfully.",
    );
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    return formData;
  };

  const pollJobUntilDone = async (createdJobId) => {
    const maxPolls = 900;
    for (let i = 0; i < maxPolls; i += 1) {
      const statusResponse = await fetch(`${apiBase}/jobs/${createdJobId}`);
      if (!statusResponse.ok) {
        const statusError = await statusResponse.json().catch(() => ({}));
        throw new Error(statusError.detail || "Unable to fetch job status");
      }

      const statusPayload = await statusResponse.json();
      setJobStatus(statusPayload.status);

      if (["completed", "partial", "failed"].includes(statusPayload.status)) {
        if (statusPayload.status === "failed") {
          throw new Error(statusPayload.error || "Analysis job failed");
        }

        const resultResponse = await fetch(
          `${apiBase}/jobs/${createdJobId}/result`,
        );
        if (!resultResponse.ok) {
          const resultError = await resultResponse.json().catch(() => ({}));
          throw new Error(resultError.detail || "Unable to fetch job result");
        }

        const payload = await resultResponse.json();
        displayResults(payload, statusPayload.status);
        return;
      }

      await sleep(2000);
    }

    throw new Error(
      "Analysis is taking too long. Please check job status and retry.",
    );
  };

  const runSyncFallback = async () => {
    setJobStatus("running-sync");
    const response = await fetch(`${apiBase}/analyze`, {
      method: "POST",
      body: buildFormData(),
    });

    if (!response.ok) {
      const syncError = await response.json().catch(() => ({}));
      throw new Error(syncError.detail || "Analysis failed");
    }

    const payload = await response.json();
    displayResults(payload, "completed");
  };

  const analyzePaper = async () => {
    if (!selectedFile) {
      showError("Please select a PDF file first");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setNotice("");
    setJobId("");
    setJobStatus("queued");
    setShowResults(false);

    try {
      const response = await fetch(`${apiBase}/jobs/analyze`, {
        method: "POST",
        body: buildFormData(),
      });

      if (response.ok) {
        const jobPayload = await response.json();
        setJobId(jobPayload.job_id);
        setJobStatus(jobPayload.status || "queued");
        await pollJobUntilDone(jobPayload.job_id);
      } else if (response.status === 404 || response.status === 405) {
        await runSyncFallback();
      } else {
        const jobError = await response.json().catch(() => ({}));
        throw new Error(jobError.detail || "Could not create analysis job");
      }
    } catch (error) {
      showError(
        error.message ||
          "Failed to analyze paper. Please make sure the backend is running.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Stark Paper Analyzer
              </h1>
              <p className="text-gray-600 mt-1">
                Upload research papers for intelligent analysis
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Backend Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Research Paper
          </h2>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input").click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg text-gray-600 mb-2">
              Drop your PDF here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports research papers up to 400 pages
            </p>
            <input
              type="file"
              id="file-input"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {selectedFile && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-blue-700">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={analyzePaper}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Paper"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Loading State */}
        {isAnalyzing && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg text-gray-600">
                  Analyzing paper in background...
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Status: {jobStatus || "queued"}{" "}
                {jobId ? `• Job ${jobId.slice(0, 8)}` : ""}
              </p>
            </div>
          </section>
        )}

        {notice && (
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Status</h3>
            <p className="text-blue-800">{notice}</p>
          </section>
        )}

        {/* Error Section */}
        {error && (
          <section className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Analysis Failed
            </h3>
            <p className="text-red-700">{error}</p>
          </section>
        )}

        {/* Results Section */}
        {showResults && currentAnalysis && (
          <section>
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                3D Knowledge Map
              </h2>
              <p className="text-gray-600 mb-6">
                Drag to rotate, scroll to zoom, and click nodes to inspect
                details.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 min-h-[460px]">
                  <Graph3DView
                    graphData={graphData}
                    selectedNodeId={selectedNode?.id}
                    onNodeClick={setSelectedNode}
                  />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Selected Node
                  </h3>
                  {selectedNode ? (
                    <div className="space-y-3">
                      <p>
                        <span className="font-medium text-gray-900">Name:</span>{" "}
                        <span className="text-gray-700">
                          {selectedNode.name}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">Type:</span>{" "}
                        <span className="text-gray-700 capitalize">
                          {selectedNode.type}
                        </span>
                      </p>
                      {selectedNode.pageStart ? (
                        <p>
                          <span className="font-medium text-gray-900">
                            Page Start:
                          </span>{" "}
                          <span className="text-gray-700">
                            {selectedNode.pageStart}
                          </span>
                        </p>
                      ) : null}
                      {selectedNode.details ? (
                        <div>
                          <p className="font-medium text-gray-900 mb-1">
                            Details
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {selectedNode.details}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Click any node in the 3D graph to view details here.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Global Analysis */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentAnalysis.global.inferred_title}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Problem Statement
                  </h3>
                  <p className="text-gray-700">
                    {currentAnalysis.global.problem_statement}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Methodology
                  </h3>
                  <p className="text-gray-700">
                    {currentAnalysis.global.methodology}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Summary
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {currentAnalysis.global.global_summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Key Contributions
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {(currentAnalysis.global.key_contributions || []).map(
                      (contrib, idx) => (
                        <li key={idx}>{contrib}</li>
                      ),
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Limitations
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {(currentAnalysis.global.limitations || []).map(
                      (limit, idx) => (
                        <li key={idx}>{limit}</li>
                      ),
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Future Work
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {(currentAnalysis.global.future_work || []).map(
                      (work, idx) => (
                        <li key={idx}>{work}</li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Section Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Section Analysis
              </h2>
              <div className="space-y-6">
                {(currentAnalysis.sections || []).map((section, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {section.section_name}
                    </h3>
                    <p className="text-gray-700 mb-4">{section.summary}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Key Points
                        </h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {(section.key_points || []).map((point, pidx) => (
                            <li key={pidx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Key Terms
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(section.key_terms || []).map((term, tidx) => (
                            <span
                              key={tidx}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
