import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

const API_URL = 'http://localhost:8000';

function log(message: string) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${message}`);
}

// DOM elements
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;
const viewerEl = document.getElementById('viewer') as HTMLDivElement;
const emptyState = document.getElementById('empty-state') as HTMLDivElement;
const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
const controlsEl = document.getElementById('controls') as HTMLDivElement;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;

let viewer: GaussianSplats3D.Viewer | null = null;

// Status helpers
function setStatus(message: string, type: 'default' | 'loading' | 'success' | 'error' = 'default') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// File handling
function handleFile(file: File) {
  log(`File selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  
  if (!file.type.startsWith('image/')) {
    setStatus('Please upload an image file', 'error');
    log('Error: Not an image file');
    return;
  }
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target?.result as string;
    previewImage.style.display = 'block';
    log('Preview loaded');
  };
  reader.readAsDataURL(file);
  
  // Upload and convert
  uploadAndConvert(file);
}

async function uploadAndConvert(file: File) {
  log('Starting upload...');
  setStatus('Uploading...', 'loading');
  uploadBtn.disabled = true;
  
  const startTime = Date.now();
  let elapsedInterval: number | undefined;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    log('Sending to backend for SHARP conversion...');
    setStatus('Converting to 3D (this may take 1-3 minutes)...', 'loading');
    
    // Update elapsed time every second
    elapsedInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setStatus(`Converting to 3D... (${elapsed}s elapsed)`, 'loading');
    }, 1000);
    
    const response = await fetch(`${API_URL}/convert`, {
      method: 'POST',
      body: formData,
    });
    
    clearInterval(elapsedInterval);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`Backend responded after ${totalTime}s`);
    
    if (!response.ok) {
      const error = await response.json();
      log(`Error: ${error.detail}`);
      throw new Error(error.detail || 'Conversion failed');
    }
    
    const result = await response.json();
    log(`Conversion complete! Job ID: ${result.job_id}`);
    setStatus('Loading 3D view...', 'loading');
    
    // Load the splat
    await loadSplat(`${API_URL}${result.splat_url}`);
    
    setStatus(`Done! (took ${totalTime}s)`, 'success');
    log('Splat loaded and rendering');
    
  } catch (error) {
    if (elapsedInterval) clearInterval(elapsedInterval);
    console.error('Error:', error);
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    setStatus(error instanceof Error ? error.message : 'Something went wrong', 'error');
  } finally {
    uploadBtn.disabled = false;
  }
}

async function loadSplat(url: string) {
  // Hide empty state, show controls
  emptyState.classList.add('hidden');
  controlsEl.style.display = 'block';
  
  // Dispose previous viewer if exists
  if (viewer) {
    viewer.dispose();
    viewer = null;
    // Clear the container
    viewerEl.innerHTML = '';
  }
  
  // Create new viewer
  viewer = new GaussianSplats3D.Viewer({
    cameraUp: [0, -1, 0],
    initialCameraPosition: [0, 0, 3],
    initialCameraLookAt: [0, 0, 0],
    rootElement: viewerEl,
    sharedMemoryForWorkers: false, // Needed for some browsers
  });
  
  try {
    await viewer.addSplatScene(url, {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: true,
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });
    
    viewer.start();
  } catch (error) {
    console.error('Failed to load splat:', error);
    throw new Error('Failed to load 3D scene');
  }
}

// Event listeners
uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
});

// Drag and drop
dropZone.addEventListener('click', () => {
  fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

// Also handle drops on the whole viewer area
viewerEl.addEventListener('dragover', (e) => {
  e.preventDefault();
});

viewerEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

// Check if backend is running
async function checkBackend() {
  log('Checking backend...');
  try {
    const response = await fetch(`${API_URL}/`);
    if (response.ok) {
      log('Backend is running');
      setStatus('Ready - upload an image', 'default');
    }
  } catch (e) {
    log(`Backend not reachable: ${e}`);
    setStatus('Backend not running (start with: python server.py)', 'error');
  }
}

log('Photo-to-Splat frontend initialized');
checkBackend();
