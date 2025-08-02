const select = document.getElementById('map-select');
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const distanciaSpan = document.getElementById('distancia');
const altitudeSpan = document.getElementById('altitude');
const azimuteSpan = document.getElementById('azimute');
const limparBtn = document.getElementById('limpar');
const definirFixoBtn = document.getElementById('definir-fixo');
const mapNameSpan = document.getElementById('map-name');
const mapSizeSpan = document.getElementById('map-size');
const mapStatusSpan = document.getElementById('map-status');
const pontoFixoSpan = document.getElementById('ponto-fixo');
const pontoSelecionadoSpan = document.getElementById('ponto-selecionado');
const totalAlvosSpan = document.getElementById('total-alvos');
const canvasContainer = document.getElementById('canvas-container');
let mapas = [];
let imagem = null;
let tiff = null;
let tiffImage = null;
let tiffData = null;
let mapaAtual = null;
let pontoFixo = null;
let pontosAlvo = [];
let pontoSelecionado = null;
let modoDefinicoFixo = false;
let originalWidth = 0;
let originalHeight = 0;
let zoomLevel = 1;
let canvasSize = 0;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let minZoom = 1;
fetch('maps/maps_data.json')
    .then(r => r.json())
    .then(data => {
        mapas = data;
        mapas.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.folder_name;
            opt.textContent = `${m.real_name} (${m.size})`;
            select.appendChild(opt);
        });
        mapStatusSpan.textContent = `${mapas.length} maps available`;
    })
    .catch(err => {
        console.error('Error loading map data:', err);
        mapStatusSpan.textContent = 'Error loading maps';
    });
function atualizarInfoMapa() {
    if (mapaAtual) {
        mapNameSpan.textContent = mapaAtual.real_name;
        mapSizeSpan.textContent = mapaAtual.size;
        mapStatusSpan.textContent = 'Map loaded';
    } else {
        mapNameSpan.textContent = '-';
        mapSizeSpan.textContent = '-';
        mapStatusSpan.textContent = 'No map selected';
    }
}
function atualizarInfoPontos() {
    if (pontoFixo) {
        pontoFixoSpan.textContent = `(${pontoFixo.x.toFixed(0)}, ${pontoFixo.y.toFixed(0)})`;
    } else {
        pontoFixoSpan.textContent = '-';
    }
    if (pontoSelecionado) {
        if (pontoSelecionado === pontoFixo) {
            pontoSelecionadoSpan.textContent = 'Fixed Point';
        } else {
            const index = pontosAlvo.indexOf(pontoSelecionado);
            pontoSelecionadoSpan.textContent = `Target ${index + 1} (${pontoSelecionado.x.toFixed(0)}, ${pontoSelecionado.y.toFixed(0)})`;
        }
    } else {
        pontoSelecionadoSpan.textContent = '-';
    }
    totalAlvosSpan.textContent = pontosAlvo.length.toString();
}
function obterCoordenadas(e) {
    const rect = canvas.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const relativeX = (clickX - centerX - panX) / zoomLevel;
    const relativeY = (clickY - centerY - panY) / zoomLevel;
    const x = (originalWidth / 2) + relativeX;
    const y = (originalHeight / 2) + relativeY;
    return { x, y };
}
function pontoProximo(p1, p2, tolerancia = 15) {
    const dist = Math.sqrt(Math.pow((p1.x - p2.x) * zoomLevel, 2) + Math.pow((p1.y - p2.y) * zoomLevel, 2));
    return dist <= tolerancia;
}
function encontrarPonto(coords) {
    if (pontoFixo && pontoProximo(coords, pontoFixo)) {
        return pontoFixo;
    }
    for (let ponto of pontosAlvo) {
        if (pontoProximo(coords, ponto)) {
            return ponto;
        }
    }
    return null;
}
function limpar() {
    pontoFixo = null;
    pontosAlvo = [];
    pontoSelecionado = null;
    distanciaSpan.textContent = '0';
    altitudeSpan.textContent = '0';
    azimuteSpan.textContent = '0';
    atualizarInfoPontos();
    limparBtn.disabled = true;
    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        desenhar();
    }
}
function calcularZoomMinimo() {
    if (!imagem || !imagem.complete) return 1;
    const containerSize = calcularTamanhoCanvas();
    const scaleX = containerSize / originalWidth;
    const scaleY = containerSize / originalHeight;
    return Math.min(scaleX, scaleY);
}
function calcularTamanhoCanvas() {
    const containerRect = canvasContainer.getBoundingClientRect();
    canvasSize = Math.min(containerRect.width, containerRect.height) - 40;
    return canvasSize;
}
function desenhar() {
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) {
        canvas.style.display = 'none';
        return;
    }
    canvas.style.display = 'block';
    const size = calcularTamanhoCanvas();
    canvas.width = size;
    canvas.height = size;
    originalWidth = imagem.width;
    originalHeight = imagem.height;
    if (minZoom === 1) {
        minZoom = calcularZoomMinimo();
        if (zoomLevel === 1) {
            zoomLevel = minZoom;
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let imageWidth = originalWidth * zoomLevel;
    let imageHeight = originalHeight * zoomLevel;
    const imageX = (canvas.width - imageWidth) / 2 + panX;
    const imageY = (canvas.height - imageHeight) / 2 + panY;
    ctx.drawImage(imagem, imageX, imageY, imageWidth, imageHeight);
    const scaleX = imageWidth / originalWidth;
    const scaleY = imageHeight / originalHeight;
    const offsetX = imageX;
    const offsetY = imageY;
    if (pontoFixo && mapaAtual) {
        const sizeKm = parseFloat(mapaAtual.size);
        const sizeM = sizeKm * 1000;
        const metrosPorPixel = sizeM / originalWidth;
        const raio1500m = (1500 / metrosPorPixel) * scaleX;
        const fixoX = pontoFixo.x * scaleX + offsetX;
        const fixoY = pontoFixo.y * scaleY + offsetY;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(fixoX, fixoY, raio1500m, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (pontoFixo) {
        const x = pontoFixo.x * scaleX + offsetX;
        const y = pontoFixo.y * scaleY + offsetY;
        ctx.fillStyle = pontoSelecionado === pontoFixo ? '#fbbf24' : '#10b981';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('F', x, y + 3);
    }
    pontosAlvo.forEach((ponto, index) => {
        const x = ponto.x * scaleX + offsetX;
        const y = ponto.y * scaleY + offsetY;
        if (pontoFixo) {
            const fixoX = pontoFixo.x * scaleX + offsetX;
            const fixoY = pontoFixo.y * scaleY + offsetY;
            ctx.strokeStyle = pontoSelecionado === ponto ? '#fbbf24' : '#f59e0b';
            ctx.lineWidth = pontoSelecionado === ponto ? 4 : 2;
            ctx.setLineDash(pontoSelecionado === ponto ? [] : [5, 5]);
            ctx.beginPath();
            ctx.moveTo(fixoX, fixoY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.fillStyle = pontoSelecionado === ponto ? '#fbbf24' : '#ef4444';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText((index + 1).toString(), x, y + 3);
    });
}
function aplicarZoom(fator, mouseX = null, mouseY = null) {
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) return;
    const novoZoom = zoomLevel * fator;
    if (novoZoom < minZoom || novoZoom > 5) return;
    if (mouseX !== null && mouseY !== null) {
        const containerRect = canvasContainer.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        panX = mouseX - centerX - (mouseX - centerX - panX) * (novoZoom / zoomLevel);
        panY = mouseY - centerY - (mouseY - centerY - panY) * (novoZoom / zoomLevel);
    }
    zoomLevel = novoZoom;
    desenhar();
}
async function carregarMapa(folder) {
    if (!folder) {
        imagem = null;
        tiff = null;
        tiffImage = null;
        tiffData = null;
        mapaAtual = null;
        limpar();
        atualizarInfoMapa();
        desenhar();
        return;
    }
    mapStatusSpan.textContent = 'Loading map...';
    mapaAtual = mapas.find(m => m.folder_name === folder);
    pontoFixo = null;
    pontosAlvo = [];
    pontoSelecionado = null;
    distanciaSpan.textContent = '0';
    altitudeSpan.textContent = '0';
    azimuteSpan.textContent = '0';
    atualizarInfoPontos();
    limparBtn.disabled = true;
    zoomLevel = 1;
    minZoom = 1;
    panX = 0;
    panY = 0;
    try {
        imagem = new window.Image();
        imagem.onload = () => {
            if (imagem.complete && imagem.naturalWidth > 0) {
                desenhar();
                mapStatusSpan.textContent = 'Minimap loaded';
            } else {
                mapStatusSpan.textContent = 'Error: invalid image';
            }
        };
        imagem.onerror = () => {
            console.error('Error loading image:', imagem.src);
            mapStatusSpan.textContent = 'Error loading minimap';
            imagem = null;
            desenhar();
        };
        imagem.src = `maps/${folder}/ingamemap.webp`;
        mapStatusSpan.textContent = 'Loading altitude data...';
        const tiffResp = await fetch(`maps/${folder}/output.tif`);
        if (!tiffResp.ok) {
            throw new Error(`HTTP ${tiffResp.status}: ${tiffResp.statusText}`);
        }
        const tiffBuffer = await tiffResp.arrayBuffer();
        tiff = await GeoTIFF.fromArrayBuffer(tiffBuffer);
        tiffImage = await tiff.getImage();
        tiffData = await tiffImage.readRasters();
        atualizarInfoMapa();
        if (imagem && imagem.complete) {
            mapStatusSpan.textContent = 'Map and altitude loaded';
        }
    } catch (error) {
        console.error('Error loading map:', error);
        mapStatusSpan.textContent = 'Error loading altitude data';
    }
}
function calcular() {
    if (!pontoSelecionado || !pontoFixo || !mapaAtual || !tiffImage || !tiffData) {
        distanciaSpan.textContent = '0';
        altitudeSpan.textContent = '0';
        azimuteSpan.textContent = '0';
        return;
    }
    const p1 = pontoFixo;
    const p2 = pontoSelecionado;
    const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    let sizeKm = parseFloat(mapaAtual.size);
    let sizeM = sizeKm * 1000;
    let metrosPorPixel = sizeM / originalWidth;
    let distM = distPx * metrosPorPixel;
    distanciaSpan.textContent = distM.toFixed(1);
    
    const deltaX = p2.x - p1.x;
    const deltaY = p1.y - p2.y;
    let azimute = Math.atan2(deltaX, deltaY) * 180 / Math.PI;
    if (azimute < 0) azimute += 360;
    azimuteSpan.textContent = azimute.toFixed(1);
    try {
        let x1 = Math.floor(p1.x);
        let y1 = Math.floor(p1.y);
        let x2 = Math.floor(p2.x);
        let y2 = Math.floor(p2.y);
        let tx1 = Math.floor(x1 * tiffImage.getWidth() / originalWidth);
        let ty1 = Math.floor(y1 * tiffImage.getHeight() / originalHeight);
        let tx2 = Math.floor(x2 * tiffImage.getWidth() / originalWidth);
        let ty2 = Math.floor(y2 * tiffImage.getHeight() / originalHeight);
        tx1 = Math.max(0, Math.min(tx1, tiffImage.getWidth() - 1));
        ty1 = Math.max(0, Math.min(ty1, tiffImage.getHeight() - 1));
        tx2 = Math.max(0, Math.min(tx2, tiffImage.getWidth() - 1));
        ty2 = Math.max(0, Math.min(ty2, tiffImage.getHeight() - 1));
        let alt1 = tiffData[0][ty1 * tiffImage.getWidth() + tx1];
        let alt2 = tiffData[0][ty2 * tiffImage.getWidth() + tx2];
        let diff = alt2 - alt1;
        altitudeSpan.textContent = diff.toFixed(1);
    } catch (error) {
        console.error('Erro no cálculo de altitude:', error);
        altitudeSpan.textContent = 'Erro';
    }
}
select.addEventListener('change', e => carregarMapa(e.target.value));
limparBtn.addEventListener('click', limpar);
definirFixoBtn.addEventListener('click', () => {
    modoDefinicoFixo = !modoDefinicoFixo;
    if (modoDefinicoFixo) {
        definirFixoBtn.textContent = 'Cancel Definition';
        definirFixoBtn.classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else {
        definirFixoBtn.textContent = 'Set Fixed Point';
        definirFixoBtn.classList.remove('active');
        canvas.style.cursor = 'crosshair';
    }
});
canvas.addEventListener('click', e => {
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0 || isDragging) return;
    const coords = obterCoordenadas(e);
    if (modoDefinicoFixo) {
        pontoFixo = coords;
        modoDefinicoFixo = false;
        definirFixoBtn.textContent = 'Set Fixed Point';
        definirFixoBtn.classList.remove('active');
        canvas.style.cursor = 'default';
        pontoSelecionado = pontoFixo;
        atualizarInfoPontos();
        desenhar();
        limparBtn.disabled = false;
    } else {
        const pontoClicado = encontrarPonto(coords);
        if (pontoClicado) {
            pontoSelecionado = pontoClicado;
            atualizarInfoPontos();
            calcular();
            desenhar();
        } else if (pontoFixo) {
            pontosAlvo.push(coords);
            pontoSelecionado = coords;
            atualizarInfoPontos();
            calcular();
            desenhar();
            limparBtn.disabled = false;
        }
    }
});
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) return;
    const coords = obterCoordenadas(e);
    const pontoClicado = encontrarPonto(coords);
    if (pontoClicado === pontoFixo) {
        pontoFixo = null;
        pontosAlvo = [];
        pontoSelecionado = null;
    } else if (pontoClicado) {
        const index = pontosAlvo.indexOf(pontoClicado);
        if (index > -1) {
            pontosAlvo.splice(index, 1);
            if (pontoSelecionado === pontoClicado) {
                pontoSelecionado = null;
            }
        }
    }
    atualizarInfoPontos();
    calcular();
    desenhar();
    limparBtn.disabled = !pontoFixo && pontosAlvo.length === 0;
});
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) return;
    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    aplicarZoom(zoomFactor, mouseX, mouseY);
});
canvas.addEventListener('mousedown', e => {
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) return;
    if (modoDefinicoFixo) return;
    const coords = obterCoordenadas(e);
    const pontoClicado = encontrarPonto(coords);
    if (pontoClicado) return;
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    panX += deltaX;
    panY += deltaY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    desenhar();
});
canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    }
});
canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    }
});
limparBtn.disabled = true;
window.addEventListener('resize', () => {
    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        desenhar();
    }
});
