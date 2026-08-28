import { initDB, saveLog, getLogs } from './db.js';
import { performOCR } from './utils/ocr.js';
import { analyzeNutrition } from './utils/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    displayLogs();

    const scanBtn = document.getElementById('scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            alert('Simulating label scan...');
            const simulatedText = "Ingredients: Phosphorus 150mg, Sodium 200mg";
            const nutritionData = await analyzeNutrition(simulatedText);
            await saveLog({
                date: new Date().toISOString(),
                text: simulatedText,
                analysis: nutritionData
            });
            displayLogs();
        });
    }
});

async function displayLogs() {
    const logList = document.getElementById('log-list');
    if (!logList) return;
    logList.innerHTML = '';
    const logs = await getLogs();
    logs.forEach(log => {
        const li = document.createElement('li');
        li.textContent = `${new Date(log.date).toLocaleTimeString()}: ${log.analysis}`;
        logList.appendChild(li);
    });
}
