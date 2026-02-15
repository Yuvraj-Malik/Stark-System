import './style.css'

const app = document.getElementById('app')

// UI State
let isAnalyzing = false
let currentAnalysis = null

// Create UI
app.innerHTML = `
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Stark Paper Analyzer</h1>
            <p class="text-gray-600 mt-1">Upload research papers for intelligent analysis</p>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-sm text-gray-600">Backend Online</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Upload Section -->
      <section class="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Upload Research Paper</h2>
        
        <div id="upload-area" class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-lg text-gray-600 mb-2">Drop your PDF here or click to browse</p>
          <p class="text-sm text-gray-500">Supports research papers up to 400 pages</p>
          <input type="file" id="file-input" accept=".pdf" class="hidden">
        </div>

        <div id="file-info" class="hidden mt-4 p-4 bg-blue-50 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-blue-900" id="file-name"></p>
              <p class="text-sm text-blue-700" id="file-size"></p>
            </div>
            <button id="analyze-btn" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Analyze Paper
            </button>
          </div>
        </div>
      </section>

      <!-- Loading State -->
      <section id="loading-section" class="hidden bg-white rounded-lg shadow-md p-8 mb-8">
        <div class="text-center">
          <div class="inline-flex items-center space-x-3">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-lg text-gray-600">Analyzing paper...</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">This may take 30-60 seconds for large papers</p>
        </div>
      </section>

      <!-- Results Section -->
      <section id="results-section" class="hidden">
        <!-- Global Analysis -->
        <div class="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6" id="paper-title"></h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Problem Statement</h3>
              <p class="text-gray-700" id="problem-statement"></p>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Methodology</h3>
              <p class="text-gray-700" id="methodology"></p>
            </div>
          </div>

          <div class="mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
            <p class="text-gray-700 leading-relaxed" id="global-summary"></p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Key Contributions</h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1" id="contributions"></ul>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Limitations</h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1" id="limitations"></ul>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Future Work</h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1" id="future-work"></ul>
            </div>
          </div>
        </div>

        <!-- Section Breakdown -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Section Analysis</h2>
          <div id="sections-container" class="space-y-6"></div>
        </div>
      </section>

      <!-- Error Section -->
      <section id="error-section" class="hidden bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-red-900 mb-2">Analysis Failed</h3>
        <p class="text-red-700" id="error-message"></p>
      </section>
    </main>
  </div>
`

// Event Handlers
document.getElementById('upload-area').addEventListener('click', () => {
  document.getElementById('file-input').click()
})

document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file && file.name.toLowerCase().endsWith('.pdf')) {
    showFileInfo(file)
  } else {
    showError('Please select a valid PDF file')
  }
})

document.getElementById('analyze-btn').addEventListener('click', analyzePaper)

// Drag and Drop
const uploadArea = document.getElementById('upload-area')

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault()
  uploadArea.classList.add('border-blue-500', 'bg-blue-50')
})

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('border-blue-500', 'bg-blue-50')
})

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault()
  uploadArea.classList.remove('border-blue-500', 'bg-blue-50')

  const file = e.dataTransfer.files[0]
  if (file && file.name.toLowerCase().endsWith('.pdf')) {
    document.getElementById('file-input').files = e.dataTransfer.files
    showFileInfo(file)
  } else {
    showError('Please drop a valid PDF file')
  }
})

// Functions
function showFileInfo(file) {
  document.getElementById('file-name').textContent = file.name
  document.getElementById('file-size').textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
  document.getElementById('file-info').classList.remove('hidden')
  hideError()
}

function showLoading() {
  document.getElementById('loading-section').classList.remove('hidden')
  document.getElementById('results-section').classList.add('hidden')
  document.getElementById('error-section').classList.add('hidden')
  document.getElementById('analyze-btn').disabled = true
  document.getElementById('analyze-btn').textContent = 'Analyzing...'
}

function hideLoading() {
  document.getElementById('loading-section').classList.add('hidden')
  document.getElementById('analyze-btn').disabled = false
  document.getElementById('analyze-btn').textContent = 'Analyze Paper'
}

function showError(message) {
  document.getElementById('error-message').textContent = message
  document.getElementById('error-section').classList.remove('hidden')
  document.getElementById('results-section').classList.add('hidden')
  hideLoading()
}

function hideError() {
  document.getElementById('error-section').classList.add('hidden')
}

function displayResults(analysis) {
  const global = analysis.global
  const sections = analysis.sections

  // Global Analysis
  document.getElementById('paper-title').textContent = global.inferred_title
  document.getElementById('problem-statement').textContent = global.problem_statement
  document.getElementById('methodology').textContent = global.methodology
  document.getElementById('global-summary').textContent = global.global_summary

  // Lists
  document.getElementById('contributions').innerHTML = global.key_contributions.map(c => `<li>${c}</li>`).join('')
  document.getElementById('limitations').innerHTML = global.limitations.map(l => `<li>${l}</li>`).join('')
  document.getElementById('future-work').innerHTML = global.future_work.map(f => `<li>${f}</li>`).join('')

  // Sections
  const sectionsContainer = document.getElementById('sections-container')
  sectionsContainer.innerHTML = sections.map(section => `
    <div class="border border-gray-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">${section.section_name}</h3>
      <p class="text-gray-700 mb-4">${section.summary}</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="font-medium text-gray-900 mb-2">Key Points</h4>
          <ul class="list-disc list-inside text-gray-700 space-y-1">
            ${section.key_points.map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h4 class="font-medium text-gray-900 mb-2">Key Terms</h4>
          <div class="flex flex-wrap gap-2">
            ${section.key_terms.map(term => `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">${term}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('')

  document.getElementById('results-section').classList.remove('hidden')
}

async function analyzePaper() {
  const file = document.getElementById('file-input').files[0]
  if (!file) {
    showError('Please select a PDF file first')
    return
  }

  showLoading()

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch('http://127.0.0.1:8000/analyze', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Analysis failed')
    }

    const result = await response.json()
    currentAnalysis = result.analysis
    displayResults(currentAnalysis)
    hideLoading()
  } catch (error) {
    showError(error.message || 'Failed to analyze paper. Please make sure the backend is running.')
  }
}