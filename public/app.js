const fileInput = document.getElementById('fileInput');
const removeBgBtn = document.getElementById('removeBgBtn');
const useFallbackBtn = document.getElementById('useFallbackBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let userImage = null;
let frameImage = new Image();
frameImage.src = 'frame.png';

let processedDataURL = null;

const CANVAS_SIZE = 1024;
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

let dragStart = null;
let imageOffset = { x: 0, y: 0 };
let imageScale = 1;
let isDragging = false;

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFinal() {
  if (!userImage || !frameImage.complete) return;
  clearCanvas();

  const fW = canvas.width;
  const fH = canvas.height;
  ctx.drawImage(frameImage, 0, 0, fW, fH);

  const cx = fW / 2;
  const cy = fH / 2;
  const radius = Math.min(fW, fH) * 0.42;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const imgW = userImage.width;
  const imgH = userImage.height;
  const scaledW = imgW * imageScale;
  const scaledH = imgH * imageScale;

  const drawX = cx - scaledW / 2 + imageOffset.x;
  const drawY = cy - scaledH / 2 + imageOffset.y;

  ctx.drawImage(userImage, drawX, drawY, scaledW, scaledH);
  ctx.restore();
  ctx.drawImage(frameImage, 0, 0, fW, fH);

  processedDataURL = canvas.toDataURL('image/png');
}

function resetAll() {
  userImage = null;
  processedDataURL = null;
  fileInput.value = '';
  imageOffset = { x: 0, y: 0 };
  imageScale = 1;
  clearCanvas();
  if (frameImage.complete) ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
}

fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;

  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    userImage = img;
    imageOffset = { x: 0, y: 0 };
    imageScale = 1;
    drawFinal();
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

removeBgBtn.addEventListener('click', async () => {
  const f = fileInput.files[0];
  if (!f) {
    alert('Please choose a file first');
    return;
  }

  const fd = new FormData();
  fd.append('photo', f);

  try {
    removeBgBtn.disabled = true;
    removeBgBtn.textContent = 'Processing...';

    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      body: fd
    });

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

useFallbackBtn.addEventListener('click', () => {
  alert('Fallback not implemented in this snippet.');
});

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

resetBtn.addEventListener('click', resetAll);

canvas.addEventListener('mousedown', (e) => {
  if (!userImage) return;
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  dragStart = { x: e.clientX, y: e.clientY };
  imageOffset.x += dx;
  imageOffset.y += dy;
  drawFinal();
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
  if (!userImage) return;
  e.preventDefault();
  const zoomAmount = 0.1;
  if (e.deltaY < 0) {
    imageScale *= (1 + zoomAmount);
  } else {
    imageScale *= (1 - zoomAmount);
    if (imageScale < 0.1) imageScale = 0.1;
  }
  drawFinal();
}, { passive: false });

frameImage.onload = () => {
  resetAll();
};
