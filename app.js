const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const defaultServices = [
  'Lavagem Externa',
  'Limpeza Interna',
  'Limpeza de Rodas e Pneus',
  'Higienização de Bancos',
  'Outros',
];
let documentType = 'recibo';
let toastTimer;

const money = (amount) => Number(amount || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const historyItems = () => JSON.parse(localStorage.getItem('jp-documents') || '[]');

function nextNumber() {
  const year = String(new Date().getFullYear());
  const savedSequence = Number(localStorage.getItem(`jp-next-number-${year}`) || 1);
  const highestSaved = historyItems().reduce((highest, item) => {
    if (!item.number?.startsWith(`${year}/`)) return highest;
    return Math.max(highest, Number(item.number.split('/')[1]) || 0);
  }, 0) + 1;
  const sequence = Math.max(savedSequence, highestSaved);
  return `${year}/${String(sequence).padStart(6, '0')}`;
}

function parseMoney(value) {
  return Number(String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
}

function formatMoneyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? (Number(digits) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) : '';
}

function bindMoneyInput(input) {
  input.addEventListener('input', () => {
    input.value = formatMoneyInput(input.value);
    updateTotals();
  });
}

function addService(name = '', price = '', selected = false) {
  const row = document.createElement('div');
  row.className = 'service-row';
  row.innerHTML = '<input class="service-check" type="checkbox" aria-label="Marcar serviço realizado">'
    + '<input class="service-name" placeholder="Serviço" aria-label="Nome do serviço">'
    + '<div class="currency-input"><span>R$</span><input class="service-price" inputmode="numeric" placeholder="0,00" aria-label="Valor do serviço"></div>'
    + '<button class="remove-service" type="button" aria-label="Remover serviço">×</button>';
  row.querySelector('.service-name').value = name;
  row.querySelector('.service-price').value = price ? Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
  row.querySelector('.service-check').checked = selected;
  row.querySelector('.service-check').addEventListener('change', updateTotals);
  row.querySelector('.service-name').addEventListener('blur', (event) => {
    event.target.value = titleCase(event.target.value);
  });
  bindMoneyInput(row.querySelector('.service-price'));
  row.querySelector('.remove-service').addEventListener('click', () => {
    if ($$('.service-row').length <= 1) return;
    row.remove();
    updateTotals();
  });
  $('#services').append(row);
}

function updateTotals() {
  const subtotal = $$('.service-row').reduce((sum, row) => (
    sum + (row.querySelector('.service-check').checked ? parseMoney(row.querySelector('.service-price').value) : 0)
  ), 0);
  const discount = parseMoney($('#discount').value);
  $('#subtotal').textContent = money(subtotal);
  $('#total').textContent = money(Math.max(0, subtotal - discount));
}

function readDocument() {
  const services = $$('.service-row').map((row) => ({
    name: row.querySelector('.service-name').value.trim(),
    price: parseMoney(row.querySelector('.service-price').value),
    selected: row.querySelector('.service-check').checked,
  })).filter((service) => service.name || service.price);
  const subtotal = services.reduce((sum, service) => sum + (service.selected ? service.price : 0), 0);
  const discount = parseMoney($('#discount').value);
  return {
    number: $('#number').value,
    type: documentType,
    date: $('#date').value,
    client: $('#client').value.trim(),
    phone: $('#phone').value.trim(),
    document: $('#document').value.trim(),
    vehicle: $('#vehicle').value.trim(),
    plate: $('#plate').value.trim(),
    color: $('#color').value.trim(),
    year: $('#year').value.trim(),
    services,
    payment: $('#payment').value,
    discount,
    subtotal,
    total: Math.max(0, subtotal - discount),
    notes: $('#notes').value.trim(),
    savedAt: new Date().toISOString(),
  };
}

function setDocumentType(type) {
  documentType = type;
  $$('.doc-tab').forEach((button) => button.classList.toggle('active', button.dataset.type === type));
  $('#documentTitle').innerHTML = type === 'recibo' ? 'Recibo <span>de lavagem</span>' : 'Orçamento';
  $('#totalLabel').textContent = type === 'recibo' ? 'Total pago' : 'Total do orçamento';
}

function fillForm(documentData = {}) {
  $('#number').value = documentData.number || nextNumber();
  $('#date').value = documentData.date || localDate();
  $('#client').value = documentData.client || '';
  $('#phone').value = documentData.phone || '';
  $('#document').value = documentData.document || '';
  $('#vehicle').value = documentData.vehicle || '';
  $('#plate').value = documentData.plate || '';
  $('#color').value = documentData.color || '';
  $('#year').value = documentData.year || '';
  $('#payment').value = documentData.payment || 'Pix';
  const selectedPayment = documentData.payment === 'Cartão de Débito' ? 'Cartão de Crédito' : (documentData.payment || 'Pix');
  $$('input[name="payChoice"]').forEach((input) => { input.checked = input.value === selectedPayment; });
  $('#discount').value = documentData.discount ? Number(documentData.discount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
  $('#notes').value = documentData.notes || '';
  $('#services').innerHTML = '';
  const services = documentData.services?.length
    ? documentData.services
    : defaultServices.map((name) => ({ name, price: '', selected: false }));
  services.slice(0, 5).forEach((service) => addService(service.name, service.price, !!service.selected));
  while ($$('.service-row').length < 5) addService();
  setDocumentType(documentData.type || 'recibo');
  updateTotals();
}

function titleCase(value) {
  const particles = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
  return value.toLocaleLowerCase('pt-BR').replace(/(^|\s)([\p{L}][\p{L}'-]*)/gu, (whole, space, word) => (
    space && particles.has(word) ? `${space}${word}` : `${space}${word.charAt(0).toLocaleUpperCase('pt-BR')}${word.slice(1)}`
  ));
}

function sentenceCase(value) {
  return value.replace(/(^|[.!?]\s+)([\p{L}])/gu, (whole, start, letter) => start + letter.toLocaleUpperCase('pt-BR'));
}

function maskDocument(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits.replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return digits.replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${area}) ${number}`;
  const splitAt = digits.length > 10 ? 5 : 4;
  return `(${area}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`;
}

function maskPlate(value) {
  return value.toLocaleUpperCase('pt-BR').replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function renderHistory() {
  const saved = historyItems();
  $('#historyList').innerHTML = saved.length ? saved.map((item, index) => (
    `<button class="history-item" data-index="${index}" type="button">`
      + `<b>${item.type === 'recibo' ? 'Recibo' : 'Orçamento'} nº ${escapeHtml(item.number)}</b>`
      + `<small>${escapeHtml(item.client)} · ${new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</small>`
      + `<strong>${money(item.total)}</strong></button>`
  )).join('') : '<div class="history-empty">Os documentos que você salvar aparecerão aqui.</div>';
  $$('.history-item').forEach((button) => button.addEventListener('click', () => {
    fillForm(historyItems()[Number(button.dataset.index)]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2600);
}

function requireClient() {
  if ($('#client').value.trim()) return true;
  toast('Informe o nome do cliente.');
  $('#client').focus();
  return false;
}

function saveDocument() {
  if (!requireClient()) return;
  const documentData = readDocument();
  const saved = historyItems();
  if (!documentData.number.includes('/') || saved.some((item) => item.number === documentData.number)) {
    documentData.number = nextNumber();
  }
  saved.unshift(documentData);
  localStorage.setItem('jp-documents', JSON.stringify(saved.slice(0, 100)));
  const [year, sequence] = documentData.number.split('/');
  localStorage.setItem(`jp-next-number-${year}`, String(Number(sequence) + 1));
  renderHistory();
  toast('Documento salvo neste aparelho.');
  fillForm({ type: documentType });
}

function printDocument() {
  if (!requireClient()) return;
  window.print();
}

$$('input[name="payChoice"]').forEach((input) => input.addEventListener('change', () => {
  $('#payment').value = input.value;
}));
$$('.doc-tab').forEach((button) => button.addEventListener('click', () => setDocumentType(button.dataset.type)));
$('#newDoc').addEventListener('click', () => fillForm({ type: documentType }));
$('#preview').addEventListener('click', printDocument);
$('#save').addEventListener('click', saveDocument);
$('#clearHistory').addEventListener('click', () => {
  if (confirm('Apagar todos os documentos salvos neste aparelho?')) {
    localStorage.removeItem('jp-documents');
    renderHistory();
    toast('Histórico apagado.');
  }
});
$('#discount').addEventListener('input', () => {
  $('#discount').value = formatMoneyInput($('#discount').value);
  updateTotals();
});
$('#plate').addEventListener('input', (event) => { event.target.value = maskPlate(event.target.value); });
$('#document').addEventListener('input', (event) => { event.target.value = maskDocument(event.target.value); });
$('#phone').addEventListener('input', (event) => { event.target.value = maskPhone(event.target.value); });
['client', 'vehicle', 'color'].forEach((id) => $('#'+id).addEventListener('blur', (event) => {
  event.target.value = titleCase(event.target.value);
}));
$('#notes').addEventListener('blur', (event) => { event.target.value = sentenceCase(event.target.value); });
$('#docForm').addEventListener('submit', (event) => event.preventDefault());
fillForm();
renderHistory();

const installButton = $('#installPwa');
let deferredInstallPrompt = null;
let installedThisSession = false;
const isAppleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobileDevice = () => navigator.userAgentData?.mobile
  || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalledPwa = () => window.matchMedia('(display-mode: standalone)').matches
  || navigator.standalone === true
  || installedThisSession;

function updateInstallButton() {
  installButton.hidden = !isMobileDevice() || isInstalledPwa();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});
window.addEventListener('appinstalled', () => {
  installedThisSession = true;
  deferredInstallPrompt = null;
  updateInstallButton();
  toast('Aplicativo instalado.');
});
installButton.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === 'accepted') installedThisSession = true;
    deferredInstallPrompt = null;
    updateInstallButton();
    return;
  }

  if (isAppleMobile()) {
    alert('No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.');
  } else {
    alert('Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.');
  }
});
updateInstallButton();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
