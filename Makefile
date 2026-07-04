.PHONY: setup start stop restart health

setup:
	@chmod +x *.sh scripts/*.py
	@./setup.sh

start:
	@./start.sh

stop:
	@./stop.sh

restart:
	@./restart.sh

health:
	@./healthcheck.sh
