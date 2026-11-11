SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.PHONY: check secrets format lint lint-dateien typecheck test audit image health-test testdb

check: secrets format lint typecheck test testdb audit
secrets:
	gitleaks git --redact --no-banner .
	gitleaks dir --redact --no-banner .
format:
	npx --no-install prettier --check app lib tests proxy.ts package.json tsconfig.json next.config.ts eslint.config.mjs
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
	@mkdir -p .docker-config
	DOCKER_CONFIG=$${DOCKER_CONFIG:-$(CURDIR)/.docker-config} docker build --platform linux/arm64 --build-arg GIT_SHA=$$(git rev-parse HEAD) -t todo-health-test:local .
health-test: image
	bash tests/health-integration.sh
testdb:
	bash tests/testdb.sh

auth-test:
	bash tests/auth-integration.sh

todo-test:
	bash tests/todo-integration.sh

ops-test: image
	bash tests/ops-integration.sh
	bash tests/ops-stack.sh

.PHONY: security
security: secrets testdb todo-test
	node tests/security-ports.mjs
