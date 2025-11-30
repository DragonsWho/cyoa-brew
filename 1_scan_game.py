import torch
import json
import cv2
import numpy as np
from PIL import Image
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor



#import huggingface_hub
# ВСТАВЬ СВОЙ ТОКЕН СЮДА В КАВЫЧКИ
#huggingface_hub.login(token="1111")

# --- НАСТРОЙКИ ---
IMAGE_PATH = "game3.png"
TEXT_PROMPT = "rectangular"  # Можно пробовать "content block" если пропускает заголовки
OUTPUT_JSON = "1_cyoa_data.json"
# -----------------

def main():
    print("Загрузка модели SAM 3...")
    model = build_sam3_image_model() 
    processor = Sam3Processor(model)

    print(f"Анализируем {IMAGE_PATH}...")
    pil_image = Image.open(IMAGE_PATH).convert("RGB")
    
    # Запуск нейросети
    inference_state = processor.set_image(pil_image)
    output = processor.set_text_prompt(state=inference_state, prompt=TEXT_PROMPT)
    masks = output["masks"]

    if masks is None:
        print("Ничего не найдено.")
        return

    # Подготавливаем картинку для отрисовки (для проверки)
    debug_img = cv2.imread(IMAGE_PATH)
    h_img, w_img, _ = debug_img.shape
    
    # 1. Сбор сырых данных
    raw_items = []
    
    for i, mask_tensor in enumerate(masks):
        mask_np = mask_tensor.squeeze().cpu().numpy() > 0
        rows, cols = np.where(mask_np)
        if len(rows) == 0: continue
        
        y1, x1 = np.min(rows), np.min(cols)
        y2, x2 = np.max(rows), np.max(cols)
        w_box = x2 - x1
        h_box = y2 - y1

        # --- МИНИМАЛЬНЫЙ ФИЛЬТР ---
        # Выкидываем только совсем крошечные пятна (шум < 10px)
        # Заголовки и широкие блоки ОСТАВЛЯЕМ
        if w_box < 10 or h_box < 10: continue 

        raw_items.append({
            "x1": int(x1), "y1": int(y1), 
            "x2": int(x2), "y2": int(y2),
            "w": int(w_box), "h": int(h_box)
        })

    # 2. УМНАЯ СОРТИРОВКА (Reading Order)
    # Логика: Сортируем по Y. Но если разница Y у двух объектов маленькая (например < 20px),
    # считаем, что они на одной строке, и тогда сортируем их по X.
    # Это решает проблему, когда одна кнопка чуть выше другой на 1 пиксель.
    
    ROW_TOLERANCE = 20 # Погрешность в пикселях для определения "строки"
    raw_items.sort(key=lambda k: (k['y1'] // ROW_TOLERANCE, k['x1']))

    final_items = []
    print(f"Найдено блоков: {len(raw_items)}")

    # 3. Отрисовка и создание JSON
    for idx, item in enumerate(raw_items):
        x1, y1, x2, y2 = item['x1'], item['y1'], item['x2'], item['y2']
        
        # ID теперь будет 1, 2, 3... по порядку чтения
        item_id = idx + 1
        
# Данные для сайта
        item_data = {
            "id": f"block_{item_id:03d}", 
            # ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ:
            "coords": {
                "x": int(x1),
                "y": int(y1),
                "w": int(item['w']),
                "h": int(item['h'])
            }
            # Больше никаких style и coords_px
        }
        final_items.append(item_data)

        # --- ОТРИСОВКА DEBUG (Красивая) ---
        
        # 1. Зеленая рамка
        cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        # 2. Текст с обводкой (чтобы читалось на любом фоне)
        text = str(item_id)
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1
        thickness = 2
        text_pos = (x1, y1 - 8) # Чуть выше рамки

        # Черная обводка (рисуем жирным снизу)
        cv2.putText(debug_img, text, text_pos, font, font_scale, (0, 0, 0), thickness + 6, cv2.LINE_AA)
        # Белый текст (рисуем тонким поверх)
        cv2.putText(debug_img, text, text_pos, font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    # Сохраняем
    with open(OUTPUT_JSON, "w", encoding='utf-8') as f:
        json.dump({"items": final_items}, f, indent=2)
        
    cv2.imwrite("1_debug_result.jpg", debug_img)
    print(f"Готово! JSON сохранен в {OUTPUT_JSON}")
    print("Открой 1_debug_result.jpg чтобы проверить нумерацию.")

if __name__ == "__main__":
    main()