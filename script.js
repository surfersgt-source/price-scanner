// ===============================================
// ! ВАЖНОЕ ПРИМЕЧАНИЕ ДЛЯ РАЗРАБОТЧИКА !
// Теперь используется клиентская библиотека puter.ai для OCR.
// Это устраняет необходимость в собственном бэкенд-прокси для распознавания текста.
// ===============================================

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture-button');
const newScanButton = document.getElementById('new-scan-button');
const videoArea = document.getElementById('camera-area');
const resultArea = document.getElementById('result-area');
const loadingArea = document.getElementById('loading-area');
const errorMessage = document.getElementById('error-message');

const context = canvas.getContext('2d');

let stream = null;

// --- Инициализация Камеры ---

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.play();

        // Сброс интерфейса
        videoArea.style.display = 'block';
        resultArea.style.display = 'none';
        loadingArea.style.display = 'none';
        errorMessage.style.display = 'none';
        captureButton.disabled = false;

    } catch (err) {
        console.error("Ошибка доступа к камере: ", err);
        errorMessage.textContent = "Ошибка доступа к камере. Убедитесь, что разрешили доступ в браузере и что вы используете устройство с камерой.";
        errorMessage.style.display = 'block';
        captureButton.disabled = true;
    }
}

// --- Захват Изображения ---

function captureImage() {
    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(video, 0, 0, width, height);

    // Получаем изображение в формате Base64 (JPEG)
    const imageDataURL = canvas.toDataURL('image/jpeg');

    // Очищаем камеру и переходим к обработке
    stopCameraStream();
    processImage(imageDataURL);
}

function stopCameraStream() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// --- Обработка Изображения и OCR ---

async function processImage(imageDataURL) {
    loadingArea.style.display = 'block';
    videoArea.style.display = 'none';
    resultArea.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        // Используем puter.ai для OCR
        if (typeof puter === 'undefined' || typeof puter.ai === 'undefined' || typeof puter.ai.img2txt !== 'function') {
            throw new Error("Библиотека puter.ai не загружена или функция img2txt недоступна.");
        }

        // puter.ai.img2txt принимает изображение в виде DataURL
        const rawText = await puter.ai.img2txt(imageDataURL);

        // Переходим к парсингу
        const { price, weight, unitPrice } = parseAndCalculate(rawText);

        // Отображение результатов
        document.getElementById('raw-text').textContent = rawText;
        document.getElementById('price-value').textContent = price ? price.toFixed(2) : '--';
        document.getElementById('weight-value').textContent = weight ? `${weight.toFixed(2)} кг` : '--';
        document.getElementById('unit-price').textContent = unitPrice ? unitPrice.toFixed(2) : '--';

        resultArea.style.display = 'block';

    } catch (error) {
        console.error("Ошибка при обработке изображения или OCR:", error);
        errorMessage.textContent = `Ошибка обработки: ${error.message}. Проверьте подключение к интернету и функциональность puter.ai.`;
        errorMessage.style.display = 'block';
    } finally {
        loadingArea.style.display = 'none';
    }
}

// --- Логика Парсинга и Расчета ---

/**
 * Ищет цену и вес в тексте и вычисляет цену за килограмм.
 * @param {string} text - Распознанный текст.
 * @returns {{price: number|null, weight: number|null, unitPrice: number|null}}
 */
function parseAndCalculate(text) {
    let price = null;
    let weight = null;
    let unitPrice = null;

    // 1. Регулярное выражение для цены: ищет числа, разделенные запятой или точкой,
    // за которыми следуют валютные символы или слова ("руб", "₽").
    // Пример: 123,45 руб. или 123.45 ₽
    const priceRegex = /(\d{1,3}(?:[.,]\d{1,2})*)\s*(?:руб|₽)/gi;
    const priceMatch = text.match(priceRegex);
    if (priceMatch && priceMatch.length > 0) {
        // Берем первую найденную цену
        const priceString = priceMatch[0].replace(/[^0-9.]/g, ''); // Очищаем от нецифр
        price = parseFloat(priceString.replace(',', '.'));
    }

    // 2. Регулярное выражение для веса: ищет числа, за которыми следуют "кг" или "г".
    // Пример: 0.5 кг или 500 г
    const weightRegex = /(\d{1,3}(?:\.\d+)?)\s*(?:кг|г)/gi;
    const weightMatch = text.match(weightRegex);
    if (weightMatch && weightMatch.length > 0) {
        // Берем первую найденную единицу веса
        const weightString = weightMatch[0].replace(/[^0-9.]/g, '');
        let weightValue = parseFloat(weightString.replace(',', '.'));

        // Конвертация в килограммы
        if (weightMatch[0].includes('г')) {
            weightValue /= 1000;
        }
        weight = weightValue;
    }

    // 3. Расчет цены за килограмм
    if (price !== null && weight !== null && weight > 0) {
        unitPrice = price / weight;
    }

    return { price, weight, unitPrice };
}


// --- Обработчики Событий ---

captureButton.addEventListener('click', captureImage);
newScanButton.addEventListener('click', () => {
    // Сброс и запуск камеры для нового сканирования
    resultArea.style.display = 'none';
    startCamera();
});

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', () => {
    captureButton.disabled = true; // Отключаем до готовности камеры
    startCamera();
});