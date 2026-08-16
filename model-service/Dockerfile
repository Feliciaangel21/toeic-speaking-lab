FROM python:3.11-slim AS whisper-build
ARG WHISPER_CPP_REF=v1.9.1
RUN apt-get update && apt-get install -y --no-install-recommends git cmake build-essential ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch ${WHISPER_CPP_REF} https://github.com/ggml-org/whisper.cpp.git /opt/whisper.cpp \
    && cmake -S /opt/whisper.cpp -B /opt/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build /opt/whisper.cpp/build -j2 --config Release

FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libgomp1 curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /service
COPY --from=whisper-build /opt/whisper.cpp /opt/whisper.cpp
COPY requirements.txt requirements-models.txt constraints-models.txt ./
ARG INSTALL_MODEL_DEPS=1
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_MODEL_DEPS" = "1" ]; then \
        pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.6.0 torchaudio==2.6.0 \
        && pip install --no-cache-dir -c constraints-models.txt -r requirements-models.txt; \
    fi
COPY app ./app
COPY scripts ./scripts
COPY data ./data
RUN chmod +x ./scripts/bootstrap_models.sh && mkdir -p /models/huggingface
ENV PYTHONPATH=/service \
    WHISPER_CPP_BIN=/opt/whisper.cpp/build/bin/whisper-cli \
    WHISPER_CPP_MODEL=/models/ggml-base.en.bin \
    HF_HOME=/models/huggingface
EXPOSE 8100
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
