#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="${CERT_DIR:-certs}"
KEY_PATH="${SSL_KEY_PATH:-${CERT_DIR}/localhost-key.pem}"
CERT_PATH="${SSL_CERT_PATH:-${CERT_DIR}/localhost-cert.pem}"
HOST_IP="${HOST_IP:-}"

mkdir -p "${CERT_DIR}"

SAN="DNS:localhost,IP:127.0.0.1"
if [[ -n "${HOST_IP}" ]]; then
  SAN="${SAN},IP:${HOST_IP}"
fi

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "${KEY_PATH}" \
  -out "${CERT_PATH}" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=${SAN}"

echo "Generated ${CERT_PATH} and ${KEY_PATH}"
