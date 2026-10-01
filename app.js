const $ = selector => document.querySelector(selector);
const canvas = $('#editorCanvas');
const ctx = canvas.getContext('2d');
const shell = $('#canvasShell');
const photoInput = $('#photoInput');
const emptyAction = $('#emptyAction');
const downloadButton = $('#downloadButton');
const resetButton = $('#resetButton');
const photoControls = $('#photoControls');
const zoomRange = $('#zoomRange');
const zoomValue = $('#zoomValue');
const frameName = $('#frameName');
const frameDots = $('#frameDots');
const toastElement = $('#toast');

const formats = {
  story: {
    filename: 'story-julio-cesar-555.png',
    frames: [
      { path: 'imagens_modelo_29-08-2026/JC__Moldura 1.png', width: 1080, height: 1920 },
      { path: 'imagens_modelo_29-08-2026/JC__Moldura 2.png', width: 1080, height: 1920 },
      { path: 'imagens_modelo_29-08-2026/JC__Moldura 3.png', width: 1080, height: 1920 },
      { path: 'imagens_modelo_29-08-2026/JC__Moldura 4.png', width: 1080, height: 1920 },
      { path: 'imagens_modelo_29-08-2026/JC__Moldura 5.png', width: 1080, height: 1870 },
      { path: 'Moldura-Vereadora-JC_Story.png', width: 1080, height: 1920 },
      { path: 'Moldura-Vereador-JC_Story.png', width: 1080, height: 1920 }
    ]
  },
  feed: {
    filename: 'feed-julio-cesar-555.png',
    frames: [
      { path: 'imagens_modelo_29-08-2026/12.png', width: 1080, height: 1080 },
      { path: 'imagens_modelo_29-08-2026/13.png', width: 1080, height: 1080 },
      { path: 'imagens_modelo_29-08-2026/14.png', width: 1080, height: 1080 },
      { path: 'Moldura-Vereadora-JC_Feed.png', width: 1080, height: 1350 },
      { path: 'Moldura-Vereador-JC_Feed.png', width: 1080, height: 1350 }
    ]
  }
};
const state = { format: 'story', indexes: { story: 0, feed: 0 }, frames: new Map(), frame: null, photo: null, baseScale: 1, zoom: 1, x: 0, y: 0, dragging: false };
const config = () => formats[state.format];
const index = () => state.indexes[state.format];

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastElement.classList.remove('show'), 2400);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function selectFrame(nextIndex) {
  state.indexes[state.format] = (nextIndex + config().frames.length) % config().frames.length;
  const selectedFrame = config().frames[index()];
  const source = encodeURI(selectedFrame.path);
  try {
    if (!state.frames.has(source)) state.frames.set(source, await loadImage(source));
    state.frame = state.frames.get(source);
    configureCanvas(selectedFrame);
    frameName.textContent = `Moldura ${index() + 1} de ${config().frames.length}`;
    renderDots();
    draw();
  } catch (error) {
    console.error(error);
    toast('Não foi possível carregar esta moldura.');
  }
}

function renderDots() {
  frameDots.replaceChildren();
  config().frames.forEach((_, dotIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `dot${dotIndex === index() ? ' active' : ''}`;
    button.setAttribute('aria-label', `Moldura ${dotIndex + 1}`);
    button.addEventListener('click', () => selectFrame(dotIndex));
    frameDots.append(button);
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#dceaf3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (state.photo) {
    const scale = state.baseScale * state.zoom;
    const width = state.photo.naturalWidth * scale;
    const height = state.photo.naturalHeight * scale;
    ctx.drawImage(state.photo, state.x - width / 2, state.y - height / 2, width, height);
  }
  if (state.frame) ctx.drawImage(state.frame, 0, 0, canvas.width, canvas.height);
}

function resetPosition() {
  if (!state.photo) return;
  state.baseScale = Math.max(canvas.width / state.photo.naturalWidth, canvas.height / state.photo.naturalHeight);
  state.zoom = 1;
  state.x = canvas.width / 2;
  state.y = canvas.height / 2;
  zoomRange.value = 100;
  zoomValue.value = '100%';
  draw();
}

function configureCanvas(selectedFrame = config().frames[index()]) {
  canvas.width = selectedFrame.width;
  canvas.height = selectedFrame.height;
  shell.dataset.format = state.format;
  shell.style.aspectRatio = `${selectedFrame.width} / ${selectedFrame.height}`;
  state.photo ? resetPosition() : draw();
}

function openPhotoPicker() { photoInput.value = ''; photoInput.click(); }
emptyAction.addEventListener('click', openPhotoPicker);
$('#photoButton').addEventListener('click', openPhotoPicker);
resetButton.addEventListener('click', resetPosition);
$('#previousFrame').addEventListener('click', () => selectFrame(index() - 1));
$('#nextFrame').addEventListener('click', () => selectFrame(index() + 1));

photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  loadImage(url).then(image => {
    state.photo = image;
    resetPosition();
    emptyAction.hidden = true;
    photoControls.hidden = false;
    resetButton.hidden = false;
    downloadButton.disabled = false;
    $('#photoButton').textContent = 'Trocar foto';
    URL.revokeObjectURL(url);
  }).catch(() => { URL.revokeObjectURL(url); toast('Não foi possível abrir essa foto.'); });
});

document.querySelectorAll('.format-tab').forEach(tab => tab.addEventListener('click', () => {
  state.format = tab.dataset.format;
  document.querySelectorAll('.format-tab').forEach(item => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  state.frame = null;
  selectFrame(index());
}));

zoomRange.addEventListener('input', () => {
  state.zoom = Number(zoomRange.value) / 100;
  zoomValue.value = `${zoomRange.value}%`;
  draw();
});

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
}
canvas.addEventListener('pointerdown', event => {
  if (!state.photo) return;
  state.dragging = true;
  canvas.classList.add('dragging');
  canvas.setPointerCapture(event.pointerId);
  const point = pointerPosition(event);
  state.pointerX = point.x;
  state.pointerY = point.y;
});
canvas.addEventListener('pointermove', event => {
  if (!state.dragging) return;
  const point = pointerPosition(event);
  state.x += point.x - state.pointerX;
  state.y += point.y - state.pointerY;
  state.pointerX = point.x;
  state.pointerY = point.y;
  draw();
});
function releasePointer() { state.dragging = false; canvas.classList.remove('dragging'); }
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

downloadButton.addEventListener('click', () => {
  if (!state.photo) return openPhotoPicker();
  draw();
  canvas.toBlob(blob => {
    if (!blob) return toast('Não foi possível gerar a imagem.');
    const file = new File([blob], config().filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: 'Tô com Júlio César 555' }).catch(error => {
        if (error.name !== 'AbortError') downloadBlob(blob);
      });
    } else downloadBlob(blob);
  }, 'image/png');
});

function downloadBlob(blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = config().filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  toast('Imagem pronta!');
}

configureCanvas();
selectFrame(0);
