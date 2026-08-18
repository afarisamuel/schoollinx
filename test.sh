#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/system/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@ecopower.com", "password":"Password123!"}' | jq -r .token)
echo "Got token"
curl -s -v -X GET http://localhost:8080/api/system/tenants -H "Authorization: Bearer $TOKEN"
