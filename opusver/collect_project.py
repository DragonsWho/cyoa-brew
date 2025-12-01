import os

# Имя выходного файла
output_filename = "full_project_code.txt"

# Расширения файлов, которые мы НЕ хотим читать (бинарные файлы)
ignore_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pyc', '.exe'}

# Папки, которые нужно пропустить (на всякий случай, например git или кэш)
ignore_dirs = {'.git', '__pycache__', 'node_modules', '.idea', '.vscode'}

def main():
    # Получаем путь к папке, где лежит скрипт
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Открываем файл для записи результата
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        
        # Обходим все папки и файлы
        for root, dirs, files in os.walk(current_dir):
            # Фильтруем папки, чтобы не заходить в игнорируемые
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                # Пропускаем сам скрипт и выходной файл
                if file == os.path.basename(__file__) or file == output_filename:
                    continue
                
                # Проверяем расширение
                _, ext = os.path.splitext(file)
                if ext.lower() in ignore_extensions:
                    print(f"Пропущен бинарный файл: {file}")
                    continue
                
                file_path = os.path.join(root, file)
                # Получаем относительный путь для красивого заголовка (например, src/core/engine.js)
                relative_path = os.path.relpath(file_path, current_dir)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        # Записываем красивый разделитель и имя файла
                        outfile.write(f"\n{'#'*60}\n")
                        outfile.write(f"FILE START: {relative_path}\n")
                        outfile.write(f"{'#'*60}\n\n")
                        
                        # Записываем содержимое файла
                        outfile.write(content)
                        
                        outfile.write(f"\n\n") # Отступ после файла
                        print(f"Добавлен: {relative_path}")
                        
                except Exception as e:
                    print(f"Ошибка при чтении {relative_path}: {e}")

    print(f"\nГотово! Все скрипты собраны в файл: {output_filename}")

if __name__ == "__main__":
    main()