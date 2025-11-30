import json
import cv2
import os
import sys

# --- НАСТРОЙКИ ---
IMAGE_PATH = "game3.jpg"          # Оригинал
JSON_PATH = "2_cyoa_data_improved.json"     # Твой JSON (от SAM или от LLM)
OUTPUT_IMAGE = "2_check_alignment.jpg" # Результат
# -----------------

def main():
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Ошибка: Нет картинки {IMAGE_PATH}")
        return
    if not os.path.exists(JSON_PATH):
        print(f"❌ Ошибка: Нет JSON {JSON_PATH}")
        return

    print(f"Загружаем {IMAGE_PATH}...")
    img = cv2.imread(IMAGE_PATH)
    if img is None:
        print("Ошибка открытия картинки (проверь формат/путь)")
        return
        
    h_img, w_img, _ = img.shape

    print(f"Читаем {JSON_PATH}...")
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Ошибка парсинга JSON: {e}")
        return

    # --- УНИВЕРСАЛЬНЫЙ СБОРЩИК ---
    # Собираем все элементы в один список, неважно, сгруппированы они или нет
    all_items = []

    # Вариант 1: Плоский список (от SAM)
    if "items" in data and isinstance(data["items"], list):
        all_items.extend(data["items"])
    
    # Вариант 2: Сгруппированный список (финальный конфиг)
    if "groups" in data and isinstance(data["groups"], list):
        for group in data["groups"]:
            if "items" in group:
                all_items.extend(group["items"])

    print(f"Найдено элементов для отрисовки: {len(all_items)}")

    # --- ОТРИСОВКА ---
    for item in all_items:
        # Пытаемся достать координаты. Ищем везде.
        coords = None
        
        # 1. Сначала ищем наш новый стандарт "coords": {x,y,w,h}
        if "coords" in item and isinstance(item["coords"], dict):
            c = item["coords"]
            # Проверяем, есть ли там нужные поля
            if "x" in c:
                coords = (int(c["x"]), int(c["y"]), int(c["w"]), int(c["h"]))
        
        # 2. Если нет, ищем старый массив "coords": [x,y,w,h]
        elif "coords" in item and isinstance(item["coords"], list):
             c = item["coords"]
             coords = (int(c[0]), int(c[1]), int(c[2]), int(c[3]))
        
        # 3. Если нет, ищем "coords_px" (старый SAM)
        elif "coords_px" in item:
            c = item["coords_px"]
            # Там формат [x1, y1, x2, y2] или [x, y, w, h]? 
            # SAM обычно давал x1, y1, x2, y2 в массиве coords_px.
            # Но если мы перешли на стандарт x,y,w,h - лучше ориентироваться на п.1
            # Допустим, тут x, y, w, h
            coords = (int(c[0]), int(c[1]), int(c[2]), int(c[3]))

        if not coords:
            print(f"⚠️ Пропуск элемента {item.get('id', '???')} - нет координат")
            continue

        x, y, w, h = coords
        x2, y2 = x + w, y + h

        # Рисуем рамку (Зеленая)
        cv2.rectangle(img, (x, y), (x2, y2), (0, 255, 0), 2)

        # Текст ID
        item_id = str(item.get("id", "??"))
        
        # Упрощаем ID для читаемости (убираем префиксы если длинно)
        display_text = item_id
        if display_text.startswith("block_"): display_text = display_text.replace("block_", "")
        if display_text.startswith("card_"): display_text = display_text.replace("card_", "")

        # Настройки шрифта (твои любимые)
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1.0
        thickness = 2
        text_pos = (x, y - 8)

        # Черная жирная обводка
        cv2.putText(img, display_text, text_pos, font, font_scale, (0, 0, 0), thickness + 6, cv2.LINE_AA)
        # Белый текст поверх
        cv2.putText(img, display_text, text_pos, font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    # Сохраняем
    cv2.imwrite(OUTPUT_IMAGE, img)
    print(f"✅ Готово! Результат: {OUTPUT_IMAGE}")

if __name__ == "__main__":
    main()