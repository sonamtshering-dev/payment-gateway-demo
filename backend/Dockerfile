# ============================================================================
# Multi-stage build for UPay Gateway
# ============================================================================

# Build stage
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

COPY . .

RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s -X main.version=1.0.0" \
    -o /build/server \
    ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata curl

# Create non-root user
RUN addgroup -S upay && adduser -S upay -G upay

WORKDIR /app

COPY --from=builder /build/server .
COPY --from=builder /build/migrations ./migrations

RUN chown -R upay:upay /app

USER upay

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["./server"]
