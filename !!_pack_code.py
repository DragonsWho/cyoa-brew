import os
import argparse
import fnmatch

# ================= НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ =================

OUTPUT_FILENAME = "!!_full_project_code.txt"

# ПРЕСЕТЫ
PRESETS = {
    'all': { 
        'description': 'Весь проект (кроме .gitignore)',
        'include': [], 
    },
    'core': {
        'description': 'Только логика (src/core, src/utils)',
        'include': ['src/core', 'src/utils', 'src/constants.js', 'src/main.js'],
    },
    'ui': {
        'description': 'Интерфейс (src/ui, styles, html)',
        'include': ['src/ui', 'src/styles', 'index.html'],
    }
}

# Какие файлы считаем кодом
ALLOWED_EXTENSIONS = {
    '.py', '.js', '.html', '.css', '.json', '.md', '.txt', 
    '.vue', '.ts', '.jsx', '.tsx', '.sh', '.yaml', '.yml', '.xml'
}

# "Жесткий" список игнорирования (работает поверх .gitignore)
ALWAYS_IGNORE = {
    '.git', '.idea', '.vscode', '__pycache__', 'node_modules', 
    'dist', 'build', 'coverage', '.DS_Store', 'thumbs.db', 
    'package-lock.json', 'yarn.lock', 
    OUTPUT_FILENAME,            # Не читать выходной файл
    os.path.basename(__file__)  # Не читать этот скрипт
}

MAX_FILE_SIZE = 500 * 1024  # 500 KB

# =============================================================

def load_gitignore_patterns(root_path):
    """Читает .gitignore и возвращает список правил."""
    gitignore_path = os.path.join(root_path, '.gitignore')
    patterns = []
    
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                patterns.append(line)
    return patterns

def is_ignored(path, root_path, patterns):
    """
    Продвинутая проверка игнорирования.
    Учитывает якоря ('/old') и простые имена ('todo').
    """
    # Нормализуем пути (чтобы везде были /, даже на Windows)
    rel_path = os.path.relpath(path, root_path).replace('\\', '/')
    name = os.path.basename(path)
    
    # 1. Базовая проверка (жесткий список)
    if name in ALWAYS_IGNORE:
        return True
    
    # Если мы внутри папки .git (на всякий случай)
    if rel_path.startswith('.git/') or rel_path == '.git':
        return True

    # 2. Проверка по правилам .gitignore
    for pattern in patterns:
        # Убираем пробелы и возможные слеши в конце (для папок)
        clean_pattern = pattern.rstrip('/')
        
        # СЛУЧАЙ А: Паттерн привязан к корню (например, /old)
        if clean_pattern.startswith('/'):
            # Убираем слеш для сравнения, но сравниваем с полным относительным путем
            pat = clean_pattern[1:]
            if fnmatch.fnmatch(rel_path, pat):
                return True
                
        # СЛУЧАЙ Б: Паттерн работает везде (например, todo)
        else:
            # Сравниваем только имя файла/папки
            if fnmatch.fnmatch(name, clean_pattern):
                return True
            
            # Или проверяем, не является ли имя частью пути (для папок типа node_modules везде)
            # Например, если путь src/utils/todo, а паттерн todo
            if clean_pattern in rel_path.split('/'):
                return True
                
    return False

def matches_preset(rel_path, preset_config):
    """Проверяет вхождение в пресет."""
    includes = preset_config.get('include', [])
    
    if not includes:
        return True # Если include пустой, берем всё (что не в gitignore)
        
    for inc in includes:
        # Нормализуем путь для сравнения
        norm_inc = inc.replace('\\', '/')
        norm_rel = rel_path.replace('\\', '/')
        
        # Совпадение: это сам файл, файл внутри папки, или папка сама
        if norm_rel == norm_inc or norm_rel.startswith(norm_inc + '/'):
            return True
            
    return False

def get_file_list(root_path, preset_name):
    """Собирает список файлов с учетом фильтров."""
    gitignore_patterns = load_gitignore_patterns(root_path)
    preset = PRESETS.get(preset_name, PRESETS['all'])
    
    valid_files = []
    
    print(f"🔍 Настройки: Пресет [{preset_name.upper()}] | .gitignore загружен ({len(gitignore_patterns)} правил)")

    for root, dirs, files in os.walk(root_path):
        # --- ВАЖНО: Фильтрация папок ДО входа в них ---
        # Мы создаем новый список dirs, исключая игнорируемые
        # Это предотвращает сканирование внутри /old или /node_modules
        
        allowed_dirs = []
        for d in dirs:
            dir_abs_path = os.path.join(root, d)
            if not is_ignored(dir_abs_path, root_path, gitignore_patterns):
                allowed_dirs.append(d)
        
        # Подменяем список папок для os.walk "на лету"
        dirs[:] = allowed_dirs
        
        # --- Обработка файлов ---
        for file in files:
            abs_path = os.path.join(root, file)
            rel_path = os.path.relpath(abs_path, root_path).replace('\\', '/')
            
            # Проверка 1: Игнор (.gitignore и blacklist)
            if is_ignored(abs_path, root_path, gitignore_patterns):
                continue
                
            # Проверка 2: Расширение файла
            _, ext = os.path.splitext(file)
            if ALLOWED_EXTENSIONS and ext.lower() not in ALLOWED_EXTENSIONS:
                continue
            
            # Проверка 3: Пресет (входит ли в выбранную группу ui/core)
            if not matches_preset(rel_path, preset):
                continue

            valid_files.append(rel_path)
            
    return sorted(valid_files)

def generate_tree_text(file_list):
    """Рисует дерево только для тех файлов, что прошли отбор."""
    tree = {}
    for path in file_list:
        parts = path.split('/')
        current = tree
        for part in parts:
            current = current.setdefault(part, {})
            
    lines = ["Directory Structure:", "", "└── ./"]
    
    def _render(subtree, prefix):
        keys = sorted(subtree.keys())
        for i, key in enumerate(keys):
            is_last = (i == len(keys) - 1)
            connector = "└── " if is_last else "├── "
            lines.append(f"{prefix}{connector}{key}")
            if subtree[key]: 
                extension = "    " if is_last else "│   "
                _render(subtree[key], prefix + extension)

    _render(tree, "    ")
    return "\n".join(lines) + "\n\n"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preset', type=str, default='all', choices=list(PRESETS.keys()))
    args = parser.parse_args()
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, OUTPUT_FILENAME)
    
    files = get_file_list(current_dir, args.preset)
    
    if not files:
        print("❌ Файлы не найдены. Проверьте .gitignore или настройки.")
        return

    print(f"📝 Отобрано файлов: {len(files)}")
    
    with open(output_path, 'w', encoding='utf-8') as outfile:
        # 1. Структура
        outfile.write(generate_tree_text(files))
        
        # 2. Код
        for rel_path in files:
            abs_path = os.path.join(current_dir, rel_path)
            try:
                if os.path.getsize(abs_path) > MAX_FILE_SIZE:
                    print(f"⚠️ Пропуск (BIG): {rel_path}")
                    continue

                with open(abs_path, 'r', encoding='utf-8') as infile:
                    outfile.write(f"\n--- {rel_path} ---\n\n")
                    outfile.write(infile.read())
                    outfile.write("\n")
            except Exception as e:
                print(f"❌ Ошибка {rel_path}: {e}")
                
    print(f"✅ Успех! Файл: {OUTPUT_FILENAME}")

if __name__ == "__main__":
    main()