const fileInput = document.getElementById('fileInput');
const removeBgBtn = document.getElementById('removeBgBtn');
const useFallbackBtn = document.getElementById('useFallbackBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let userImage = null;     // Image with bg removed or original
let frameImage = new Image();
frameImage.src = 'frame.png'; // your circular frame image in public folder

let processedDataURL = null;

const CANVAS_SIZE = 1024;
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Variables for drag & zoom
let dragStart = null;
let imageOffset = { x: 0, y: 0 };
let imageScale = 1;
let isDragging = false;

// Clear canvas helper
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw user image clipped in circle + frame overlay
function drawFinal() {
  if (!userImage || !frameImage.complete) return;
  clearCanvas();

  const fW = canvas.width;
  const fH = canvas.height;

  // Draw frame first
  ctx.drawImage(frameImage, 0, 0, fW, fH);

  // Circle center and radius inside frame
  const cx = fW / 2;
  const cy = fH / 2;
  const radius = Math.min(fW, fH) * 0.42;

  ctx.save();

  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Calculate scaled image size
  const imgW = userImage.width;
  const imgH = userImage.height;
  const scaledW = imgW * imageScale;
  const scaledH = imgH * imageScale;

  // Position image according to offset + center
  const drawX = cx - scaledW / 2 + imageOffset.x;
  const drawY = cy - scaledH / 2 + imageOffset.y;

  ctx.drawImage(userImage, drawX, drawY, scaledW, scaledH);

  ctx.restore();

  // Draw frame again to overlay any borders
  ctx.drawImage(frameImage, 0, 0, fW, fH);

  processedDataURL = canvas.toDataURL('image/png');
}

// Reset all variables and canvas
function resetAll() {
  userImage = null;
  processedDataURL = null;
  fileInput.value = '';
  imageOffset = { x: 0, y: 0 };
  imageScale = 1;
  clearCanvas();
  if (frameImage.complete) ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
}

// Load image from file input (original image, no bg removal)
fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    userImage = img;

    // Reset drag/zoom on new image
    imageOffset = { x: 0, y: 0 };
    imageScale = 1;

    drawFinal();
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

// Remove background using server API
removeBgBtn.addEventListener('click', async () => {
  const f = fileInput.files[0];
  if (!f) { alert('Please choose a file first'); return; }

  const fd = new FormData();
  fd.append('photo', f);

  try {
    removeBgBtn.disabled = true;
    removeBgBtn.textContent = 'Processing...';

    const res = await fetch('/api/process-image', 
 {
      method: 'POST',
      body: fd
    });

    if (res.status === 402) {
      const j = await res.json();
      alert('Server not configured for remove.bg: ' + (j.error || 'No API key'));
      removeBgBtn.disabled = false;
      removeBgBtn.textContent = 'Remove Background (server, better)';
      return;
    }

    if (!res.ok) {
      const txt = await res.text();
      alert('Server error: ' + txt);
      removeBgBtn.disabled = false;
      removeBgBtn.textContent = 'Remove Background (server, better)';
      return;
    }

    const data = await res.json();
    const dataUrl = data.image;

    const img = new Image();
    img.onload = () => {
      userImage = img;

      // Reset drag/zoom on new image
      imageOffset = { x: 0, y: 0 };
      imageScale = 1;

      drawFinal();
      removeBgBtn.disabled = false;
      removeBgBtn.textContent = 'Remove Background (server, better)';
    };
    img.src = dataUrl;

  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
    removeBgBtn.disabled = false;
    removeBgBtn.textContent = 'Remove Background (server, better)';
  }
});

// Client-side fallback background removal (optional)
useFallbackBtn.addEventListener('click', () => {
  alert('Fallback not implemented in this snippet.');
});

// Download final image
downloadBtn.addEventListener('click', () => {
  if (!processedDataURL) {
    alert('Nothing to download yet.');
    return;
  }
  const a = document.createElement('a');
  a.href = processedDataURL;
  a.download = 'framed.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Reset everything
resetBtn.addEventListener('click', resetAll);

// --- DRAG & ZOOM HANDLERS ---

// Mouse down - start dragging
canvas.addEventListener('mousedown', (e) => {
  if (!userImage) return;
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

// Mouse move - drag image
canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  dragStart = { x: e.clientX, y: e.clientY };
  imageOffset.x += dx;
  imageOffset.y += dy;
  drawFinal();
});

// Mouse up - stop dragging
canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

// Mouse leave - stop dragging if leaving canvas
canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

// Wheel - zoom image
canvas.addEventListener('wheel', (e) => {
  if (!userImage) return;
  e.preventDefault();

  // Zoom sensitivity
  const zoomAmount = 0.1;

  if (e.deltaY < 0) {
    // zoom in
    imageScale *= (1 + zoomAmount);
  } else {
    // zoom out, but limit minimum scale
    imageScale *= (1 - zoomAmount);
    if (imageScale < 0.1) imageScale = 0.1;
  }

  drawFinal();
}, { passive: false });

// Draw frame initially
frameImage.onload = () => {
  resetAll();
};
