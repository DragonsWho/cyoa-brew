import json
import glob
import os

# Настройки
INPUT_FILES = ["page1.json", "page2.json", "page3.json"] # Укажи файлы по порядку или используй glob
OUTPUT_FILE = "cyoa_config.json"

def merge_jsons(files):
    master_config = {
        "meta": {"pages": []},
        "points": [],
        "groups": []
    }
    
    seen_points = set()

    for page_index, filename in enumerate(files):
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Processing Page {page_index}: {filename}")

        # 1. Merge Images
        # Если в json страницы есть массив pages, берем его, иначе ищем одну картинку
        if "meta" in data and "pages" in data["meta"]:
            master_config["meta"]["pages"].extend(data["meta"]["pages"])
        
        # 2. Merge Points (исключаем дубликаты)
        if "points" in data:
            for p in data["points"]:
                if p["id"] not in seen_points:
                    master_config["points"].append(p)
                    seen_points.add(p["id"])

        # 3. Merge Groups + INJECT PAGE INDEX
        if "groups" in data:
            for group in data["groups"]:
                # Важнейшая часть: добавляем индекс страницы в группу
                group["page"] = page_index
                master_config["groups"].append(group)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(master_config, f, indent=2, ensure_ascii=False)
    
    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    # Если файлы названы page_1.json, page_2.json, можно найти их автоматически:
    # files = sorted(glob.glob("page*.json"))
    merge_jsons(INPUT_FILES)