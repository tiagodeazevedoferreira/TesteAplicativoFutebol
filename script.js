console.log('script.js iniciado');

const API_KEY = 'YOUR_SECURE_API_KEY'; // Replace with environment variable
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

let allDataSheet1 = [];
let allDataSheet2 = [];
let allDataSheet3 = [];
let filteredDataTab1 = [];
let filteredDataTab2 = [];
let filteredDataTab3 = [];
let filteredDataTab4 = [];
let filteredDataTab5 = [];
let isPivotTab1 = false;
let isPivotTab2 = false;
let isPivotTab5 = false;
let convocacoesChart = null;

async function fetchSheetData(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:R100?key=${API_KEY}`; // Reduced to 100 rows for performance
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!data.values || data.values.length === 0) throw new Error(`No data in ${sheetName}`);
    return data.values;
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error.message);
    showError(`Failed to load ${sheetName}: ${error.message}. Try again later.`);
    return [];
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function clearError() {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(num => parseInt(num) || 0);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// [Rest of the functions remain unchanged for brevity, e.g., populateFiltersSheet1, updateBigNumbers, etc.]

async function init() {
  console.log('Initializing application');
  try {
    allDataSheet1 = await fetchSheetData('Sheet1');
    allDataSheet2 = await fetchSheetData('Sheet2');
    allDataSheet3 = await fetchSheetData('Classificação');

    if (allDataSheet1.length === 0) {
      showError('No data available in Sheet1. Check connection or API key.');
      return;
    }
    if (allDataSheet2.length === 0) {
      showError('No data available in Sheet2. Check connection or API key.');
      return;
    }
    if (allDataSheet3.length === 0) {
      showError('No data available in Classificação. Check connection or API key.');
      return;
    }

    populateFiltersSheet1(allDataSheet1);
    populateFiltersSheet2(allDataSheet2);
    populateFiltersSheet3(allDataSheet3);
    showUpcomingGames(allDataSheet1);

    ['tab1', 'tab2', 'tab3', 'tab4', 'tab5'].forEach(tab => {
      document.getElementById(`${tab}-btn`)?.addEventListener('click', () => showTab(tab));
    });

    showTab('tab1');
  } catch (error) {
    console.error('Initialization error:', error.message);
    showError(`Initialization failed: ${error.message}`);
  }
}

document.addEventListener('DOMContentLoaded', init);