FROM python:3.11-slim

WORKDIR /executor
RUN useradd -m -u 1000 sandbox && pip install --no-cache-dir flask gunicorn

COPY docker/code-executor/executor.py .
RUN chown -R sandbox:sandbox /executor
USER sandbox

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "executor:app"]
