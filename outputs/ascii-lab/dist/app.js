const $ = (id) => document.getElementById(id);
const baseline = ' .,:;!iIl+*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao#MW&8%B@$';
const defaults = { mode: 'pixels', resolution: 900, correction: true, brightness: 0, contrast: 1, saturation: 1, pixelate: true, pixelSize: 4, paletteEnabled: true, palette: 'neon', dither: 'bayer', strength: .65, font: 'Consolas, monospace', fontSize: 12, gapX: 0, gapY: 0, chars: baseline, matching: 'tone', shapeWeight: .45, background: '#0c061b', blur: 3, backgroundOpacity: 1, opacity: 1, allowEmpty: true, emptyThreshold: 6 };
let settings = { ...defaults };
let palettes = [
    { id: 'neon', name: 'Neon ink · 4', author: 'Локальная палитра по референсу', colors: ['0c061b', 'fa327e', '37cbd3', 'd1f9fc'] },
    { id: 'pico-8', name: 'PICO-8', author: 'Lexaloffle', url: 'https://lospec.com/palette-list/pico-8', colors: ['000000', '1d2b53', '7e2553', '008751', 'ab5236', '5f574f', 'c2c3c7', 'fff1e8', 'ff004d', 'ffa300', 'ffec27', '00e436', '29adff', '83769c', 'ff77a8', 'ffccaa'] },
    { id: 'gb', name: 'Pocket green · 4', author: 'Локальная ретропалитра', colors: ['0f380f', '306230', '8bac0f', '9bbc0f'] },
    { id: 'mono', name: 'Paper & ink · 2', author: 'Монохром', colors: ['000000', 'ffffff'] },
    { id: 'dust', name: 'Dust · 5', author: 'Локальная палитра', colors: ['25283d', '705d56', 'b88b76', 'dbb69b', 'eee9de'] }
];
let imported = [];
function validPalette(p) { const a = p; return !!a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.author === 'string' && Array.isArray(a.colors) && a.colors.length > 0 && a.colors.length <= 1024 && a.colors.every(c => typeof c === 'string' && /^[0-9a-f]{6}$/i.test(c)); }
try {
    const saved = JSON.parse(localStorage.getItem('glyph-palettes') || '[]');
    if (Array.isArray(saved))
        imported = saved.filter(validPalette);
    const chars = localStorage.getItem('glyph-chars');
    if (chars !== null)
        settings.chars = chars;
}
catch { /* A fresh session works without persistent storage. */ }
palettes.push(...imported.filter(p => !palettes.some(x => x.id === p.id)));
function persist(key, value) { try {
    localStorage.setItem(key, value);
}
catch {
    $('error').textContent = 'Браузер не разрешил локальное сохранение. Текущая сессия продолжает работать.';
} }
const ranges = [
    ['brightness', 'Яркость', -100, 100, 1, 'correctionControls'], ['contrast', 'Контраст', .25, 3, .05, 'correctionControls'], ['saturation', 'Насыщенность', 0, 2.5, .05, 'correctionControls'],
    ['pixelSize', 'Размер пикселя', 1, 24, 1, 'pixelControls'], ['strength', 'Сила дизеринга', 0, 1, 0.05, 'ditherControls'], ['shapeWeight', 'Важность формы', 0, 1, .05, 'shapeControls'],
    ['fontSize', 'Размер символа', 8, 40, 1, 'typeControls'], ['gapX', 'Интервал по горизонтали', 0, 16, 1, 'typeControls'], ['gapY', 'Интервал по вертикали', 0, 20, 1, 'typeControls'],
    ['blur', 'Размытие фона', 0, 12, .5, 'overlayControls'], ['backgroundOpacity', 'Непрозрачность пиксельного фона', 0, 1, .05, 'overlayControls'], ['opacity', 'Непрозрачность символов', 0, 1, .05, 'overlayControls'], ['emptyThreshold', 'Заливка однотонных участков', 0, 40, 1, 'emptyControls']
];
for (const [key, label, min, max, step, target] of ranges) {
    const wrapper = document.createElement('div');
    const l = document.createElement('label');
    l.htmlFor = key;
    l.className = 'slider-label';
    l.append(label);
    const out = document.createElement('output');
    out.id = key + 'Value';
    l.append(out);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = key;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const track = document.createElement('span');
    track.className = 'ascii-track';
    track.id = key + 'Track';
    track.setAttribute('aria-hidden', 'true');
    const control = document.createElement('div');
    control.className = 'ascii-range';
    control.append(track, input);
    wrapper.append(l, control);
    $(target).append(wrapper);
}
const sets = { 'Буквы': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 'Цифры': '0123456789', 'Знаки': ' .,:;!?+-=*/\\|()[]{}<>~^_@#$%&', 'Рамки': '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╱╲╳', 'Блоки': ' ░▒▓█▀▄▌▐▖▗▘▙▚▛▜▝▞▟', 'Геометрия': '○●◐◑◒◓◔◕◇◆□■△▲▽▼◀▶' };
for (const [name, chars] of Object.entries(sets)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => { settings.chars = Array.from(new Set(Array.from(settings.chars + chars))).join(''); sync(); saveChars(); requestRender(); };
    $('sets').append(b);
}
function saveChars() { persist('glyph-chars', settings.chars); }
function updatePalette() { const p = palettes.find(p => p.id === settings.palette); $('swatches').replaceChildren(); for (const color of p.colors) {
    const el = document.createElement('span');
    el.style.background = '#' + color;
    el.style.setProperty('--swatch', '#' + color);
    el.title = '#' + color;
    $('swatches').append(el);
} $('credit').replaceChildren(document.createTextNode(`${p.colors.length} цветов · ${p.author} `)); if (p.url) {
    const a = document.createElement('a');
    a.textContent = 'Lospec ↗';
    a.href = p.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    $('credit').append(a);
} }
function fillPalettes() { const select = $('palette'); select.replaceChildren(); for (const p of palettes) {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    select.append(option);
} select.value = settings.palette; updatePalette(); }
function sync() {
    for (const [key, value] of Object.entries(settings)) {
        const input = document.getElementById(key);
        if (!input)
            continue;
        if (input.type === 'checkbox')
            input.checked = Boolean(value);
        else
            input.value = String(value);
        const out = document.getElementById(key + 'Value');
        if (out)
            out.textContent = String(value);
    }
    $('charCount').textContent = `(${new Set(Array.from(settings.chars)).size})`;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === settings.mode));
    $('dither').disabled = !settings.paletteEnabled;
    $('strength').disabled = !settings.paletteEnabled || settings.dither === 'none';
    $('shapeWeight').disabled = settings.matching !== 'shape';
    for (const key of ['brightness', 'contrast', 'saturation'])
        $(key).disabled = !settings.correction;
    $('pixelate').disabled = settings.mode === 'ascii';
    $('pixelSize').disabled = !settings.pixelate || settings.mode === 'ascii';
    $('pixelHint').textContent = settings.mode === 'ascii' ? 'В ASCII размер ячейки задаётся размером символа и интервалами ниже. Пикселизация здесь не применяется.' : 'Размер пикселя меняет цветные блоки фона. ASCII имеет отдельную сетку.';
    $('emptyThreshold').disabled = !settings.allowEmpty;
    $('blur').disabled = settings.mode !== 'overlay';
    $('backgroundOpacity').disabled = settings.mode !== 'overlay';
    for (const [key, , min, max] of ranges) {
        const value = Number(settings[key]);
        const position = Math.round((value - min) / (max - min) * 23);
        const track = $(key + 'Track');
        track.replaceChildren(...Array.from('[' + '='.repeat(position) + '|' + '-'.repeat(23 - position) + ']', char => { const span = document.createElement('span'); span.textContent = char; return span; }));
    }
    updatePalette();
}
for (const key of Object.keys(settings)) {
    const input = document.getElementById(key);
    if (!input)
        continue;
    input.addEventListener('input', () => { const value = input.type === 'checkbox' ? input.checked : typeof defaults[key] === 'number' ? Number(input.value) : input.value; Object.assign(settings, { [key]: value }); if (key === 'chars')
        saveChars(); sync(); requestRender(); });
}
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { settings.mode = b.dataset.mode; sync(); requestRender(); });
document.querySelectorAll('button[data-view]').forEach(b => b.onclick = () => {
    const view = b.dataset.view;
    $('previews').dataset.view = view;
    document.querySelectorAll('button[data-view]').forEach(v => { v.classList.toggle('active', v === b); v.setAttribute('aria-pressed', String(v === b)); });
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
    const chars = settings.chars;
    settings = { ...defaults, chars, resolution: settings.resolution };
    if (b.dataset.preset === 'ascii')
        Object.assign(settings, { mode: 'ascii', palette: 'pico-8', dither: 'floyd', strength: .7, fontSize: 12 });
    if (b.dataset.preset === 'soft')
        Object.assign(settings, { mode: 'overlay', palette: 'dust', pixelSize: 9, blur: 4, fontSize: 15, matching: 'shape', shapeWeight: .55, opacity: .85 });
    if (b.dataset.preset === 'gameboy')
        Object.assign(settings, { palette: 'gb', pixelSize: 5, dither: 'atkinson', strength: 1 });
    sync();
    requestRender();
});
$('clearChars').onclick = () => { settings.chars = ''; sync(); saveChars(); requestRender(); };
$('oneChar').onclick = () => { settings.chars = '+'; sync(); saveChars(); requestRender(); };
$('defaultChars').onclick = () => { settings.chars = baseline; sync(); saveChars(); requestRender(); };
$('import').onclick = async () => {
    const button = $('import');
    button.disabled = true;
    $('importStatus').textContent = 'Запрашиваем Lospec…';
    try {
        let slug = $('paletteUrl').value.trim();
        if (/^https?:\/\//.test(slug)) {
            const url = new URL(slug);
            if (!['lospec.com', 'www.lospec.com'].includes(url.hostname))
                throw Error('Нужна ссылка именно на lospec.com.');
            slug = url.pathname.replace(/^\/palette-list\//, '').replace(/\/$/, '').replace(/\.json$/, '');
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120)
            throw Error('Вставь ссылку на палитру или её имя, например sweetie-16.');
        const response = await fetch('/api/palette/' + slug, { signal: AbortSignal.timeout(20000) });
        if (!response.ok)
            throw Error('Lospec не вернул палитру. Проверь имя и подключение к интернету.');
        const data = await response.json();
        const p = { id: slug, name: data.name, author: typeof data.author === 'string' ? data.author : 'Lospec', colors: data.colors, url: 'https://lospec.com/palette-list/' + slug };
        if (!validPalette(p))
            throw Error('Получен неподдерживаемый ответ Lospec (ожидается 1–1024 HEX-цветов).');
        palettes = palettes.filter(v => v.id !== slug);
        palettes.push(p);
        imported = imported.filter(v => v.id !== slug);
        imported.push(p);
        persist('glyph-palettes', JSON.stringify(imported));
        settings.palette = slug;
        settings.paletteEnabled = true;
        fillPalettes();
        sync();
        requestRender();
        $('importStatus').textContent = `Добавлена «${p.name}», ${p.colors.length} цветов. Сохранена локально.`;
    }
    catch (error) {
        $('importStatus').textContent = error instanceof Error ? error.message : String(error);
    }
    finally {
        button.disabled = false;
    }
};
let source = null, sourceName = 'Пример', loadVersion = 0, revision = 0, busy = false, dirty = false, timer, lastStarted = 0;
const worker = new Worker('./worker.js', { type: 'module' });
worker.onerror = () => { busy = false; dirty = false; $('status').textContent = 'Ошибка обработки'; $('error').textContent = 'Не удалось запустить обработку. Открой страницу в актуальном Chrome или Edge и обнови её.'; };
worker.onmessage = (event) => {
    busy = false;
    const result = event.data;
    if (result.id === revision) {
        if (result.error) {
            $('error').textContent = result.error;
            $('status').textContent = 'Проверь настройки';
        }
        else if (result.image) {
            const c = $('result');
            c.width = result.image.width;
            c.height = result.image.height;
            c.getContext('2d').putImageData(result.image, 0, 0);
            $('outputInfo').textContent = `${c.width} × ${c.height}`;
            $('status').textContent = `Готово · ${Math.round(result.ms)} мс`;
            $('error').textContent = '';
            $('export').disabled = false;
            const p = palettes.find(p => p.id === settings.palette);
            $('recipe').textContent = `${result.columns} × ${result.rows} ячеек · ${settings.paletteEnabled ? p.name : 'исходные цвета'} · ${settings.paletteEnabled ? settings.dither : 'без дизеринга'}${result.glyphs ? ' · ' + result.glyphs + ' символов' : ''}`;
        }
    }
    if (dirty)
        schedule();
};
function requestRender() { revision++; dirty = true; $('export').disabled = true; if (source)
    $('status').textContent = 'Обрабатываем…'; schedule(); }
function schedule() { if (busy || timer !== undefined || !source)
    return; timer = window.setTimeout(() => { timer = undefined; if (dirty)
    dispatch(); }, Math.max(0, 180 - (performance.now() - lastStarted))); }
function dispatch() { if (!source)
    return; dirty = false; busy = true; lastStarted = performance.now(); const ratio = Math.min(1, settings.resolution / Math.max(source.naturalWidth, source.naturalHeight)); const w = Math.max(1, Math.round(source.naturalWidth * ratio)), h = Math.max(1, Math.round(source.naturalHeight * ratio)); const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0, w, h); const data = ctx.getImageData(0, 0, w, h); const original = $('original'); original.width = w; original.height = h; original.getContext('2d').putImageData(data, 0, 0); const p = palettes.find(p => p.id === settings.palette); const palette = p.colors.map(hex => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]); const job = { id: revision, image: data, settings: { ...settings }, palette }; worker.postMessage(job, [data.data.buffer]); }
async function loadImage(url, name) { const version = ++loadVersion; const image = new Image(); image.src = url; try {
    await image.decode();
    if (version !== loadVersion)
        return;
    source = image;
    sourceName = name;
    $('sourceInfo').textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
    requestRender();
}
catch {
    if (version === loadVersion)
        $('error').textContent = 'Не удалось открыть изображение. Попробуй PNG, JPG или WebP.';
} }
function loadFile(file) { if (!file)
    return; if (!file.type.startsWith('image/')) {
    $('error').textContent = 'Выбери файл изображения.';
    return;
} if (file.size > 40 * 1024 * 1024) {
    $('error').textContent = 'Для прототипа используй изображение до 40 МБ.';
    return;
} const url = URL.createObjectURL(file); void loadImage(url, file.name).finally(() => URL.revokeObjectURL(url)); }
$('file').onchange = e => { loadFile(e.target.files?.[0]); e.target.value = ''; };
const drop = $('drop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer?.files[0]); };
$('sample').onclick = () => void loadImage('./sample.png', 'reference');
$('export').onclick = () => { const canvas = $('result'); canvas.toBlob(blob => { if (!blob)
    return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = sourceName.replace(/\.[^.]+$/, '') + '-glyph-lab.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }, 'image/png'); };
for (const frame of document.querySelectorAll('.canvas-wrap')) {
    const edges = ['top', 'bottom', 'left', 'right'].map(side => { const edge = document.createElement('span'); edge.className = 'terminal-border ' + side; edge.setAttribute('aria-hidden', 'true'); frame.append(edge); return edge; });
    const measure = document.createElement('canvas').getContext('2d');
    new ResizeObserver(() => {
        const width = frame.clientWidth, height = frame.clientHeight;
        const style = getComputedStyle(edges[0]);
        measure.font = `${style.fontSize} ${style.fontFamily}`;
        const characterWidth = measure.measureText('-').width || 7.2;
        const horizontal = '+' + '-'.repeat(Math.max(0, Math.floor(width / characterWidth) - 2)) + '+';
        edges[0].textContent = edges[1].textContent = horizontal;
        edges[2].textContent = edges[3].textContent = '|\n'.repeat(Math.ceil(height / 16));
    }).observe(frame);
}
fillPalettes();
sync();
void loadImage('./sample.png', 'reference');
export {};
