import { Html5Qrcode } from 'html5-qrcode';
import { db } from './db.js';
import { scanIngredients } from './utils/ocr.js';
import { fetchBarcodeData } from './utils/api.js';

// Dashboard Elements
const btnExport = document.getElementById('btn-export');
const fluidButtons = document.querySelectorAll('.fluid-btn');
const foodList = document.getElementById('food-list');
const btnScanIngredients = document.getElementById('btn-scan-ingredients');
const btnScanBarcode = document.getElementById('btn-scan-barcode');
const readerElement = document.getElementById('reader');

// Modal Elements
const portionModal = document.getElementById('portion-modal');
const modalFoodName = document.getElementById('modal-food-name');
const modalPhos = document.getElementById('modal-phos');
const modalK = document.getElementById('modal-k');
const modalNa = document.getElementById('modal-na');
const modalPro = document.getElementById('modal-pro');
const portionSlider = document.getElementById('portion-slider');
const portionValue = document.getElementById('portion-value');
const btnConfirmPortion = document.getElementById('btn-confirm-portion');
const btnCancelPortion = document.getElementById('btn-cancel-portion');

let pendingFoodData = null;

// -------------------------------------------------------------
// Render Dashboard & Calculate Totals with Dynamic Limits
// -------------------------------------------------------------
async function renderDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const logs = await db.logs.where('date').equals(today).toArray();
  
  // Pull the limits securely from the local database
  const settings = await db.settings.get(1) || {
    phosLimit: 1000,
    potassiumLimit: 3000,
    sodiumLimit: 2300,
    proteinLimit: 84,
    fluidLimit: 1500
  };

  let totalPhos = 0;
  let totalK = 0;
  let totalNa = 0;
  let totalPro = 0;
  let totalFluid = 0;

  foodList.innerHTML = '';

  logs.forEach(item => {
    totalPhos += item.phos_mg || 0;
    totalK += item.potassium_mg || 0;
    totalNa += item.sodium_mg || 0;
    totalPro += item.protein_g || 0;
    totalFluid += item.fluid_ml || 0;

    const li = document.createElement('li');
    li.className = 'food-log-item';
    
    // Format the log item display based on whether it's fluid or food
    if (item.fluid_ml !== 0 && (item.phos_mg === 0 && item.potassium_mg === 0)) {
      const sign = item.fluid_ml > 0 ? '+' : '';
      li.innerHTML = `<strong>${item.foodName}</strong>: ${sign}${item.fluid_ml} mL`;
    } else {
      li.innerHTML = `<strong>${item.foodName}</strong><br>
        <small>${item.phos_mg}mg Phos | ${item.potassium_mg}mg K | ${item.sodium_mg}mg Na | ${item.protein_g}g Pro</small>`;
    }
    
    foodList.appendChild(li);
  });

  // Helper function to update bars and apply the red danger class
  const checkLimit = (id, current, max, unit) => {
    const card = document.getElementById(id);
    const prog = document.getElementById(id.replace('metric-', 'prog-'));
    
    if (!card || !prog) return;

    prog.value = current;
    prog.max = max; 
    card.querySelector('.value').textContent = `${current} / ${max} ${unit}`;
    
    // If the patient is over their limit, make it red!
    if (current > max) {
      card.classList.add('over-limit');
    } else {
      card.classList.remove('over-limit');
    }
  };

  checkLimit('metric-phos', totalPhos, settings.phosLimit, 'mg');
  checkLimit('metric-k', totalK, settings.potassiumLimit, 'mg');
  checkLimit('metric-na', totalNa, settings.sodiumLimit, 'mg');
  checkLimit('metric-pro', totalPro, settings.proteinLimit, 'g');
  checkLimit('metric-fluid', totalFluid, settings.fluidLimit, 'mL');
}

// -------------------------------------------------------------
// CSV Export Logic
// -------------------------------------------------------------
btnExport.addEventListener('click', async () => {
  const logs = await db.logs.orderBy('timestamp').toArray();
  if (logs.length === 0) {
    alert('No logs found to export.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date,Time,Food/Beverage,Phosphorus (mg),Potassium (mg),Sodium (mg),Protein (g),Fluid (mL)\r\n";

  logs.forEach(item => {
    const date = item.date || '';
    const time = new Date(item.timestamp).toLocaleTimeString() || '';
    const name = `"${(item.foodName || '').replace(/"/g, '""')}"`;
    const phos = item.phos_mg || 0;
    const k = item.potassium_mg || 0;
    const na = item.sodium_mg || 0;
    const pro = item.protein_g || 0;
    const fluid = item.fluid_ml || 0;

    csvContent += `${date},${time},${name},${phos},${k},${na},${pro},${fluid}\r\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `phosguard_log_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// -------------------------------------------------------------
// Fluid Tracker Logic (Supports Addition and Removal)
// -------------------------------------------------------------
fluidButtons.forEach(button => {
  button.addEventListener('click', async (e) => {
    const targetBtn = e.target.closest('.fluid-btn');
    if (!targetBtn) return;

    const mlAmount = parseInt(targetBtn.getAttribute('data-ml'));
    const isNegative = mlAmount < 0;
    
    // Safely pull the volume text (e.g., "4 oz (120 mL)") from the UI
    let labelText = "Water";
    if (targetBtn.parentElement && targetBtn.parentElement.previousElementSibling) {
        labelText = targetBtn.parentElement.previousElementSibling.textContent.trim();
    }

    const today = new Date().toISOString().split('T')[0];

    await db.logs.add({
      date: today,
      timestamp: Date.now(),
      foodName: isNegative ? `Correction (-${labelText})` : `Beverage (${labelText})`,
      phos_mg: 0,
      potassium_mg: 0,
      sodium_mg: 0,
      protein_g: 0,
      fluid_ml: mlAmount,
      hasAdditiveWarning: false
    });

    renderDashboard();
  });
});

// -------------------------------------------------------------
// Interactive Modal Logic (Real-time math calculations)
// -------------------------------------------------------------
function updateModalMath() {
  if (!pendingFoodData) return;
  const multiplier = parseFloat(portionSlider.value);
  portionValue.textContent = multiplier.toFixed(2);
  
  modalPhos.textContent = Math.round(pendingFoodData.phos_mg * multiplier);
  modalK.textContent = Math.round(pendingFoodData.potassium_mg * multiplier);
  modalNa.textContent = Math.round(pendingFoodData.sodium_mg * multiplier);
  modalPro.textContent = Math.round(pendingFoodData.protein_g * multiplier);
}

if (portionSlider) {
  portionSlider.addEventListener('input', updateModalMath);
}

if (btnCancelPortion) {
  btnCancelPortion.addEventListener('click', () => {
    portionModal.style.display = 'none';
    pendingFoodData = null;
  });
}

if (btnConfirmPortion) {
  btnConfirmPortion.addEventListener('click', async () => {
    if (!pendingFoodData) return;
    
    const multiplier = parseFloat(portionSlider.value);
    const today = new Date().toISOString().split('T')[0];
    
    await db.logs.add({
      date: today,
      timestamp: Date.now(),
      foodName: pendingFoodData.name,
      phos_mg: Math.round(pendingFoodData.phos_mg * multiplier) || 0,
      potassium_mg: Math.round(pendingFoodData.potassium_mg * multiplier) || 0,
      sodium_mg: Math.round(pendingFoodData.sodium_mg * multiplier) || 0,
      protein_g: Math.round(pendingFoodData.protein_g * multiplier) || 0,
      hasAdditiveWarning: false
    });
    
    portionModal.style.display = 'none';
    pendingFoodData = null;
    renderDashboard();
  });
}

// -------------------------------------------------------------
// Camera & OCR Logic
// -------------------------------------------------------------
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.capture = 'environment';

if (btnScanIngredients) {
  btnScanIngredients.addEventListener('click', () => fileInput.click());
}

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

// -------------------------------------------------------------
// Barcode Scanner Logic
// -------------------------------------------------------------
let html5QrCode;

if (btnScanBarcode) {
  btnScanBarcode.addEventListener('click', async () => {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    if (readerElement.style.display === 'block') {
      await html5QrCode.stop();
      readerElement.style.display = 'none';
      btnScanBarcode.textContent = 'Scan Barcode';
      return;
    }

    readerElement.style.display = 'block';
    btnScanBarcode.textContent = 'Cancel Scan';

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      async (decodedText) => {
        await html5QrCode.stop();
        readerElement.style.display = 'none';
        btnScanBarcode.textContent = 'Fetching Data...';

        try {
          const foodData = await fetchBarcodeData(decodedText, 1); 

          if (foodData) {
            pendingFoodData = foodData;
            modalFoodName.textContent = foodData.name;
            portionSlider.value = 1; 
            updateModalMath(); 
            
            portionModal.style.display = 'flex'; 
            btnScanBarcode.textContent = 'Scan Barcode';
            
          } else {
            alert('Product not found in the database. Please scan ingredients instead.');
            btnScanBarcode.textContent = 'Scan Barcode';
          }
        } catch (error) {
          console.error("API Fetch Error:", error);
          alert('Error fetching product data.');
          btnScanBarcode.textContent = 'Scan Barcode';
        }
      },
      (errorMessage) => { }
    ).catch((err) => {
      console.error("Camera start failed", err);
      alert("Could not access the camera. Please check your browser permissions.");
      btnScanBarcode.textContent = 'Scan Barcode';
      readerElement.style.display = 'none';
    });
  });
}

renderDashboard();
