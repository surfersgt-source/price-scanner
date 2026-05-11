// ===============================================
// ! ВАЖНОЕ ПРИМЕЧАНИЕ ДЛЯ РАЗРАБОТЧИКА !
// Используется клиентская библиотека puter.ai для OCR.
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

// !!! ВАЖНО: Установите ваш токен API здесь !!!
// Если puter.ai не принимает токен через аргументы, эта переменная будет проигнорирована.
const PUTER_AI_TOKEN = "ВАШ_СЕКРЕТНЫЙ_ТОКЕН_API";

// --- Инициализация Камеры ---

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;

        // Ожидаем, пока видеоэлемент будет готов к воспроизведению
        await new Promise((resolve) => video.onloadedmetadata = resolve);

        video.play();

        // Сброс интерфейса
        videoArea.style.display = 'block';
        resultArea.style.display = 'none';
        loadingArea.style.display = 'none';
        errorMessage.style.display = 'none';

        // Кнопка становится активной, так как камера успешно запущена
        captureButton.disabled = false;

    } catch (err) {
        console.error("Ошибка доступа к камере: ", err);
        errorMessage.textContent = "Ошибка доступа к камере. Убедитесь, что разрешили доступ в браузере и что вы используете устройство с камерой.";
        errorMessage.style.display = 'block';

        // Если камера не заработала, скрываем кнопку и делаем ее неактивной
        captureButton.style.display = 'none';
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
        /*// Используем puter.ai для OCR
        if (typeof puter === 'undefined' || typeof puter.ai === 'undefined' || typeof puter.ai.img2txt !== 'function') {
            throw new Error("Библиотека puter.ai не загружена или функция img2txt недоступна.");
        }

        // !!! ПОПЫТКА ИСПОЛЬЗОВАНИЯ ТОКЕНА !!!
        // Предполагаем, что puter.ai.img2txt принимает токен в виде опции.
        // Если это не сработает, вам потребуется бэкенд.
        const options = {};
        if (PUTER_AI_TOKEN && PUTER_AI_TOKEN !== "ВАШ_СЕКРЕТНЫЙ_ТОКЕН_API") {
            // Это пример. Если puter.ai требует токен в другом формате,
            // эту строку нужно будет изменить согласно их документации.
            options.authToken = PUTER_AI_TOKEN;
        }*/

        const rawText = await recognizeBase64(imageDataURL)
		/*puter.ai.img2txt({
			source: imageDataURL,
			provider: 'mistral',
			model: 'mistral-ocr-latest',
			includeImageBase64: true
		});*/

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
        errorMessage.textContent = `Ошибка обработки: ${error.message}. Проверьте подключение к интернету, токен API и функциональность puter.ai.`;
        errorMessage.style.display = 'block';
    } finally {
        loadingArea.style.display = 'none';
    }
}

async function recognizeBase64(base64String) {
        
        
            //const base64String = reader.result; // Например: "data:image/png;base64,iVBORw0KGgo..."
            const apiKey = 'helloworld';        // Бесплатный ключ-пример
            const language = 'rus';             // Код для русского языка [citation:1][citation:7]

            // Шаг 2: Готовим данные для POST-запроса
            const formData = new FormData();
            formData.append('base64Image', base64String);
            formData.append('apikey', apiKey);
            formData.append('language', language);

            // Шаг 3: Отправляем POST-запрос на основной эндпоинт
            const url = 'https://api.ocr.space/parse/image';
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                // Шаг 4: Обрабатываем результат
                if (data.IsErroredOnProcessing) {
                    
                } else if (data.ParsedResults && data.ParsedResults.length > 0) {
                    console.log(data.ParsedResults[0].ParsedText);
					return data.ParsedResults[0].ParsedText;
                } else {
                    console.log('Текст не распознан.')//document.getElementById('result').innerText = 'Текст не распознан.';
                }
            } catch (error) {
                console.log('Ошибка запроса: ' + error.message)//document.getElementById('result').innerText = 'Ошибка запроса: ' + error.message;
            }
        

        
    };
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
    // Кнопка всегда видима при загрузке, но неактивна, пока камера не запустится
    captureButton.style.display = 'block';
    captureButton.disabled = true; // Изначально отключена
    startCamera();
});