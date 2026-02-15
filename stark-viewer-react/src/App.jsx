import React, { useState } from 'react'

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [showResults, setShowResults] = useState(false)

  const handleFileSelect = (file) => {
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file)
      setError('')
    } else {
      setError('Please select a valid PDF file')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const showError = (message) => {
    setError(message)
    setShowResults(false)
    setIsAnalyzing(false)
  }

  const displayResults = (analysis) => {
    setCurrentAnalysis(analysis)
    setShowResults(true)
    setError('')
  }

  const analyzePaper = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file first')
      return
    }

    setIsAnalyzing(true)
    setError('')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/analyze'}`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Analysis failed')
      }

      const result = await response.json()
      displayResults(result.analysis)
    } catch (error) {
      showError(error.message || 'Failed to analyze paper. Please make sure the backend is running.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stark Paper Analyzer</h1>
              <p className="text-gray-600 mt-1">Upload research papers for intelligent analysis</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Research Paper</h2>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input').click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg text-gray-600 mb-2">Drop your PDF here or click to browse</p>
            <p className="text-sm text-gray-500">Supports research papers up to 400 pages</p>
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
                  <p className="font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-sm text-blue-700">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={analyzePaper}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Paper'}
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
                <span className="text-lg text-gray-600">Analyzing paper...</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds for large papers</p>
            </div>
          </section>
        )}

        {/* Error Section */}
        {error && (
          <section className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Analysis Failed</h3>
            <p className="text-red-700">{error}</p>
          </section>
        )}

        {/* Results Section */}
        {showResults && currentAnalysis && (
          <section>
            {/* Global Analysis */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentAnalysis.global.inferred_title}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Problem Statement</h3>
                  <p className="text-gray-700">{currentAnalysis.global.problem_statement}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Methodology</h3>
                  <p className="text-gray-700">{currentAnalysis.global.methodology}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                <p className="text-gray-700 leading-relaxed">{currentAnalysis.global.global_summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Contributions</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {currentAnalysis.global.key_contributions.map((contrib, idx) => (
                      <li key={idx}>{contrib}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Limitations</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {currentAnalysis.global.limitations.map((limit, idx) => (
                      <li key={idx}>{limit}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Future Work</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {currentAnalysis.global.future_work.map((work, idx) => (
                      <li key={idx}>{work}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Section Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Section Analysis</h2>
              <div className="space-y-6">
                {currentAnalysis.sections.map((section, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{section.section_name}</h3>
                    <p className="text-gray-700 mb-4">{section.summary}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Key Points</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {section.key_points.map((point, pidx) => (
                            <li key={pidx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Key Terms</h4>
                        <div className="flex flex-wrap gap-2">
                          {section.key_terms.map((term, tidx) => (
                            <span key={tidx} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
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
  )
}

export default App
