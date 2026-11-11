SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.PHONY: check secrets format lint lint-dateien typecheck test audit image health-test

check: secrets format lint typecheck test audit
secrets:
	gitleaks git --redact --no-banner .
	gitleaks dir --redact --no-banner .
format:
	npx --no-install prettier --check app lib tests package.json tsconfig.json next.config.ts eslint.config.mjs
lint:
	npx --no-install eslint . --max-warnings 0
typecheck:
	npx --no-install tsc --noEmit
test:
	node --test tests/*.test.mjs
audit:
	npm audit --omit=dev --audit-level=high
lint-dateien:
	@files="$(filter %.ts %.tsx %.js %.jsx %.mjs,$(DATEIEN))"; if [ -n "$$files" ]; then npx --no-install eslint --max-warnings 0 $$files; fi
image:
	docker build --platform linux/arm64 --build-arg GIT_SHA=$$(git rev-parse HEAD) -t todo-health-test:local .
health-test: image
	bash tests/health-integration.sh
