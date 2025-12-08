# Makefile for CYOA Brew

# --- Config ---
SSH_HOST := root@165.227.118.100
SERVICE_NAME := cyoa-brew
REMOTE_DIR := /root/cyoabrew
NPM := npm

# Загружаем переменные из .env (нужны CLOUDFLARE_ZONE_ID и CLOUDFLARE_API_TOKEN)
ifneq (,$(wildcard .env))
  include .env
  export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*$$/\1/p' .env)
endif

.PHONY: install dev build preview clean help ship logs cf-purge open-incognito

# По умолчанию - помощь
help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make dev      - Start development server"
	@echo "  make ship     - Build, Deploy and PURGE CACHE"
	@echo "  make logs     - Show server logs"

install:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

preview:
	$(NPM) run preview

clean:
	rm -rf dist

# --- Cloudflare Operations ---

# Очистка кэша только для этого поддомена
cf-purge:
	@echo "🧹 Purging Cloudflare cache for brew.cyoa.cafe..."
	@curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$(CLOUDFLARE_ZONE_ID)/purge_cache" \
		-H "Authorization: Bearer $(CLOUDFLARE_API_TOKEN)" \
		-H "Content-Type: application/json" \
		--data '{"files":["https://brew.cyoa.cafe", "https://brew.cyoa.cafe/", "https://brew.cyoa.cafe/index.html"]}'
	@echo "\n✅ Cache purged."

# Открытие в инкогнито для проверки (Linux/Chrome)
open-incognito:
	google-chrome --incognito "https://brew.cyoa.cafe" >/dev/null 2>&1 &

# --- Deployment ---

ship:
	@echo "🚀 Starting deployment for CYOA Brew..."
	
	# 1. Локальная сборка
	$(NPM) run build
	
	# 2. Заливка на сервер
	ssh $(SSH_HOST) 'rm -rf $(REMOTE_DIR)/dist/*'
	scp -r dist/* $(SSH_HOST):$(REMOTE_DIR)/dist/
	
	# 3. Перезапуск сервиса (на всякий случай)
	ssh $(SSH_HOST) 'systemctl restart $(SERVICE_NAME)'
	
	# 4. Ядерный удар по кэшу
	$(MAKE) cf-purge
	
	@echo "✅ Deployment complete! Check the site."
	$(MAKE) open-incognito # раскомментируй, если хочешь авто-открытие

logs:
	ssh $(SSH_HOST) 'journalctl -u $(SERVICE_NAME) -f -n 50'



	# --- Release Workflow ---

# Использование: 
# make release v=1.0.1   <-- Установить конкретную версию
# make release v=patch   <-- 1.0.0 -> 1.0.1
# make release v=minor   <-- 1.0.1 -> 1.1.0
# make release v=major   <-- 1.1.0 -> 2.0.0

# минимально совместимую версию вводить вручную в src/constants.js

release:
ifndef v
	$(error Please supply a version. Usage: make release v=patch/minor/major OR v=1.0.1)
endif
	@echo "📦 Preparing release..."

	# 1. Проверка на чистоту директории
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "❌ Error: Working directory is not clean. Commit your changes first."; \
		exit 1; \
	fi

	# 2. Цепочка команд: обновление версии -> правка файла -> коммит -> тег -> пуш
	# Важно: внутри этого блока нет комментариев, чтобы не ломать bash-скрипт
	@NEW_VER=$$($(NPM) version $(v) --no-git-tag-version) && \
	echo "Update version to $$NEW_VER..." && \
	node -e "const fs = require('fs'); const path = 'src/constants.js'; let c = fs.readFileSync(path, 'utf8'); c = c.replace(/export const APP_VERSION = \".*\";/, 'export const APP_VERSION = \"' + '$$NEW_VER'.replace(/^v/, '') + '\";'); fs.writeFileSync(path, c);" && \
	git add package.json package-lock.json src/constants.js && \
	git commit -m "chore(release): $$NEW_VER" && \
	git tag $$NEW_VER && \
	git push && git push --tags && \
	echo "🚀 Version $$NEW_VER released and pushed! GitHub Action will build it now."