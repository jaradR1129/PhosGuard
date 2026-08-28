import { db } from './db.js';
import { scanIngredients } from './utils/ocr.js';
import { fetchBarcodeData } from './utils/api.js';

// Elements
const progPhos = document.getElementById('prog-phos');
const progK = document.getElementById('prog-k');
const foodList = document.getElementById('food-list');
const btnScanIngredients = document.getElementById('btn-scan-ingredients');
const btnScanBarcode = document.getElementById('btn-scan-barcode');

// Render daily logs & calculate gauge totals
async function renderDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const logs = await db.logs.where('date').equals(today).toArray();

  let totalPhos = 0;
  let totalK = 0;

  foodList.innerHTML = '';

  logs.forEach(item => {
    totalPhos += item.phos_mg || 0;
    totalK += item.potassium_mg || 0;

    const li = document.createElement('li');
    li.style.background = '#fff';
    li.style.padding = '12px';
    li.style.borderRadius = '8px';
    li.innerHTML = `<strong>${item.foodName}</strong>: ${item.phos_mg}mg Phos | ${item.potassium_mg}mg K`;
    foodList.appendChild(li);
  });

  progPhos.value = totalPhos;
  progK.value = totalK;
  document.querySelector('#metric-phos .value').textContent = `${totalPhos} / 1000 mg`;
  document.querySelector('#metric-k .value').textContent = `${totalK} / 2500 mg`;
}

// Hidden file input for camera / image OCR capture
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.capture = 'environment';

btnScanIngredients.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  btnScanIngredients.textContent = 'Analyzing Label...';
  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = async () => {
    const result = await scanIngredients(img);
    if (result.isDangerous) {
      alert('⚠️ Warning: Inorganic phosphate additives detected in this product!');
    } else {
      alert('✅ No obvious inorganic phosphate additives found.');
    }
    btnScanIngredients.textContent = 'Scan Ingredients (Phos-Catcher)';
  };
});

// Initial dashboard load
renderDashboard();
