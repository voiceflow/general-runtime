#!/bin/bash

rm -rf certs/
mkdir -p certs/ && cd certs/
LAN_IP=$(ifconfig en0 | grep "inet " | awk '{print $2}')
mkcert localhost 127.0.0.1 ::1 $(echo "$(hostname)" | tr '[:upper:]' '[:lower:]') $(hostname) $LAN_IP 192.168.18.1 0.0.0.0

# Rename certificate and key
mv *-key.pem localhost.key
mv *.pem localhost.crt
