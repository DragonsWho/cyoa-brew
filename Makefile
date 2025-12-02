# Makefile for CYOA Brew

# Переменные
NPM := npm

.PHONY: install dev build preview clean help

# По умолчанию - помощь
help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies (run this first)"
	@echo "  make dev      - Start development server"
	@echo "  make build    - Build production version to /dist"
	@echo "  make preview  - Preview the production build locally"
	@echo "  make clean    - Remove build artifacts"

# Установка зависимостей
install:
	$(NPM) install

# Запуск сервера разработки (с горячей перезагрузкой)
dev:
	$(NPM) run dev

# Сборка проекта
build:
	$(NPM) run build

# Предпросмотр сборки (проверка перед заливкой)
preview:
	$(NPM) run preview

# Очистка папки dist
clean:
	rm -rf dist