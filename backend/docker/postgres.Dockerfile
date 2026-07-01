FROM pgvector/pgvector:pg16 AS builder

# Build deps for Apache AGE
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    postgresql-server-dev-16 \
    libreadline-dev \
    zlib1g-dev \
    bison \
    flex \
    && rm -rf /var/lib/apt/lists/*

# Clone and build Apache AGE (PG16 compatible branch)
RUN git -c http.sslVerify=false clone --depth 1 --branch PG16/v1.5.0-rc0 \
    https://github.com/apache/age.git /tmp/age \
    && cd /tmp/age \
    && make PG_CONFIG=/usr/lib/postgresql/16/bin/pg_config \
    && make PG_CONFIG=/usr/lib/postgresql/16/bin/pg_config install

# ─── Final image ─────────────────────────────────────────────────────────────
FROM pgvector/pgvector:pg16

# Copy compiled AGE extension from builder
COPY --from=builder /usr/lib/postgresql/16/lib/age.so \
                    /usr/lib/postgresql/16/lib/age.so
COPY --from=builder /usr/share/postgresql/16/extension/age* \
                    /usr/share/postgresql/16/extension/

COPY docker/postgres-init/ /docker-entrypoint-initdb.d/
