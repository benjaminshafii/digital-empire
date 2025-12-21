# Photo to Splat

Convert single photos to 3D Gaussian Splats using Apple's SHARP model, then view them interactively in your browser.

## Requirements

- Python 3.11+ (for SHARP)
- Node.js 18+ (for frontend)
- macOS with Apple Silicon (M1/M2/M3) - runs on MPS, no CUDA needed

## Setup

### 1. Install SHARP (Python backend)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install SHARP from Apple's repo
pip install git+https://github.com/apple/ml-sharp.git
```

The SHARP model checkpoint (~500MB) will download automatically on first run.

### 2. Install Frontend

```bash
cd frontend
pnpm install
```

## Running

### Start the backend (in one terminal)

```bash
cd backend
source venv/bin/activate
python server.py
```

Server runs at http://localhost:8000

### Start the frontend (in another terminal)

```bash
cd frontend
pnpm dev
```

Frontend runs at http://localhost:5173

## Usage

1. Open http://localhost:5173
2. Upload or drag & drop an image
3. Wait for SHARP to convert it (takes ~10-30 seconds on M1)
4. Explore the 3D scene:
   - **Drag** to rotate
   - **Scroll** to zoom
   - **Right-click drag** to pan

## How It Works

1. **Upload**: Image sent to Python backend
2. **SHARP**: Apple's neural network predicts 3D Gaussian parameters from the single image
3. **Output**: Generates a `.ply` file with Gaussian splats
4. **Render**: Three.js + GaussianSplats3D renders the splats in WebGL

## Notes

- First conversion takes longer as the model downloads
- Works best with photos of real scenes (not illustrations)
- SHARP produces "nearby views" - you can move the camera slightly, not do full 360°
- Output splats are saved in `backend/outputs/`

## Troubleshooting

**"SHARP CLI not found"**
- Make sure you installed SHARP: `pip install git+https://github.com/apple/ml-sharp.git`
- Make sure your virtualenv is activated

**Slow performance**
- SHARP runs on CPU/MPS, not CUDA
- First run downloads the ~500MB model
- Typical inference is 10-30s on Apple Silicon

**"Backend not running"**
- Start the Python server first: `python server.py`
