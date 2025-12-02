pipeline

0. кладем страничку game.png

1. распознаем в SAM3 
    python .\1_scan_game.py  
    получаем координаты, 1_cyoa_data.json

2. отправляем в Gemini на доработку рамок

    Промпт

У меня есть JSON с координатами кнопок для веб-верстки. Они были распознаны автоматически и немного "пляшут". Это попытка сделать интерактивную версию из статичной CYOA, так что дополнительные распознанные карточки (зеленые наложенные рамки) должны быть строго поверх оригинальных рамок карточек в игре.
Посмотри на данные JSON. Ты заметишь группы элементов, которые явно должны быть одинаковыми.
Твоя задача — "причесать" координаты (Smart Align):
Если элементы идут в ряд (у них почти одинаковый top), сделай им абсолютно одинаковый top.
Если элементы выглядят как карточки одного типа, сделай им одинаковые width и height (возьми среднее или максимальное значение).
выделенные области не должны накладываться друг на друга, меж ними всегда должен быть зазор минимум в  10 пикселей.
Если рамки перекрываются - сверься с иллюстрацией что бы понять куда и какую рамку лучше сместить.
Выровняй отступы между ними, если они идут списком.
Не меняй ID.
Верни только исправленный JSON.



    прикладываем 1_debug_result.jpg и 1_cyoa_data.json

    получаем json, сохраняем в 2_cyoa_data_improved.json

    проверяем python .\2_draw_boxes.py -> смотрим 2_check_alignment.jpg

3. добавляем логику

    отправляем 2_cyoa_data_improved.json и 2_check_alignment.jpg в Gemini  с просьбой добавить сюдыть логику кнопок.

    Промпт

*контекст*
Мы переводим статичные CYOA в более интерактивный формат. Скрипт будет отображать дополнительный прозрачный слой поверх картинки с интерактивными кнопками которые можно будет кликать. Мы уже распознали картинку и сделали json с координатами.

**INPUTS:**
1.  **Image:** An image file of the CYOA page. Так же здесь отмечены зелеными рамочками с нумерацией в верхнем-левом углу распознанные карточки. Нумерация временная (белые цифры с черной окантовкой над верхним левым углом  зеленой рамочки) совпадает с нумерацией в json.
2.  **Layout JSON:** A list of detected bounding boxes with coordinates (`x`, `y`, `w`, `h`) and temporary IDs (`block_001`, 'block_002', etc.).
 
 Your task is to convert an image of a game page and a raw JSON of bounding boxes into a structured `cyoa_config.json` with full game logic.



**OUTPUT:**
A valid JSON file following the **CYOA Standard 1.0** schema defined below.

---

### **DATA SCHEMA & RULES**

#### **1. Structure**
```json
{
  "meta": {
    "title": "Name of the CYOA",
    "pages": ["filename.png"] 
  },
  "points": [
    { "id": "sparks", "name": "Sparks", "start": 10 } 
  ],
  "groups": [ ... ]
}
```
*   **points**: Identify all currencies mentioned (e.g., Points, Gold, Credits). Infer the starting amount from the intro text.

#### **2. Groups (Logic Containers)**
You must visually group items based on headers (e.g., "Perks", "Drawbacks", "Companions").
```json
{
  "id": "g_perks",
  "title": "Perks",
  "rules": {
    "max_choices": 1,   // If text says "Choose one"
    "min_choices": 1,   // If text says "You must take one"
    "multiselect": true // Default is true (checkboxes). If false -> Radio buttons.
  },
  "items": [ ... ]
}
```

#### **3. Items (The Cards)**
Map the input Layout JSON blocks to these items. merge header/image/text blocks if they belong to one card.
*   **id**: Create a semantic ID (e.g., `perk_strong`, `item_sword`). DO NOT use `block_001`.
*   **coords**: Copy `x`, `y`, `w`, `h` from the Layout JSON.
*   **title**: Extract from image.
*   **description**: Extract full text from image.

#### **4. Logic & Costs (CRITICAL)**

**A. Simple Cost:**
If an item costs 10 points:
```json
"cost": [ { "currency": "sparks", "value": -10 } ]
```
If an item GIVES 5 points (Drawback):
```json
"cost": [ { "currency": "sparks", "value": 5 } ]
```

**B. Conditional Cost (Discounts/Freebies):**
If text says: *"Cost 10, but Free if you have 'Warrior'"*.
Use JavaScript ternary operator syntax. Helper function `has('id')` is available.
```json
"cost": [
  {
    "currency": "sparks",
    "value": -10,
    "condition": "has('class_warrior') ? 0 : -10"
  }
]
```
If text says: *"Cost 20, 50% discount if 'Rich'"*:
```json
"condition": "has('trait_rich') ? -10 : -20"
```

**C. Requirements & Incompatibility:**
*   **Requirements:** Text says *"Requires 'Magic'"*.
    `"requirements": ["class_magic"]`
*   **Incompatible:** Text says *"Incompatible with 'Tech'"*.
    `"incompatible": ["class_tech"]`
*   **Negative Requirement:** Text says *"Cannot be taken if you have 'Weak'"*.
    `"requirements": ["!trait_weak"]`

---

Example Output Item:

JSON
{
  "id": "boon_strength",
  "title": "Super Strength",
  "coords": { "x": 120, "y": 500, "w": 300, "h": 150 },  
  "cost": [ { "currency": "sparks", "value": -1 } ]
}

### **PROCESS INSTRUCTIONS**

1.  **Analyze the Image:** Read the Intro text to find Starting Points. Read headers to define Groups.
2.  **Map Coordinates:** Match the visual text to the provided Layout JSON blocks. If a card consists of multiple blocks (Image + Text), use the union rectangle or the main text block coordinates.
3.  **Extract Logic:** Read every card text carefully. Look for keywords: "Free if", "Requires", "Incompatible", "Discount", "Gain".
4.  **Generate JSON:** Output **ONLY** the valid JSON.



получаем json, сохраняем в web_view\cyoa_config.json

Запускаем сервер
D:\sam3test\web_view> python -m http.server

Добавляем в web_view картинку с cyoa, следим что бы название совпало с тем что в json

идем смотреть результат  http://localhost:8000/







 