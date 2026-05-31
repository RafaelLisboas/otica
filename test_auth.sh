#!/usr/bin/env bash
set -euo pipefail
TMP=/tmp/otica_test_cookies
BASE=http://127.0.0.1:8000

echo "Login with old password..."
resp=$(curl -s -c "$TMP" -H "Content-Type: application/json" -d '{"user":"admin","password":"admin123"}' "$BASE/api/login")
echo "$resp"
if echo "$resp" | grep -q '"ok": true'; then echo "login ok"; else echo "login failed"; exit 1; fi

echo "Change password to admin321..."
resp=$(curl -s -b "$TMP" -H "Content-Type: application/json" -d '{"oldPassword":"admin123","newPassword":"admin321"}' "$BASE/api/change-password")
echo "$resp"
if echo "$resp" | grep -q '"ok": true'; then echo "changed"; else echo "change failed"; exit 2; fi

echo "Logout..."
curl -s -b "$TMP" "$BASE/api/logout" >/dev/null

echo "Login with old password (should fail)..."
resp=$(curl -s -c "$TMP" -H "Content-Type: application/json" -d '{"user":"admin","password":"admin123"}' "$BASE/api/login")
echo "$resp"
if echo "$resp" | grep -q '"ok": true'; then echo "old password still works (FAIL)"; exit 3; else echo "old password rejected (OK)"; fi

echo "Login with new password..."
resp=$(curl -s -c "$TMP" -H "Content-Type: application/json" -d '{"user":"admin","password":"admin321"}' "$BASE/api/login")
echo "$resp"
if echo "$resp" | grep -q '"ok": true'; then echo "new login ok"; else echo "new login failed"; exit 4; fi

echo "Revert password..."
resp=$(curl -s -b "$TMP" -H "Content-Type: application/json" -d '{"oldPassword":"admin321","newPassword":"admin123"}' "$BASE/api/change-password")
echo "$resp"
if echo "$resp" | grep -q '"ok": true'; then echo "reverted"; else echo "revert failed"; exit 5; fi

echo "TESTS OK"
