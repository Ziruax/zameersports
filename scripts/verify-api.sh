#!/bin/bash
# Verification suite for ZameerSports.shop public API (Task 5-c)
# Usage: bash scripts/verify-api.sh
BASE="http://localhost:3000"
PASS=0; FAIL=0

ok()  { PASS=$((PASS+1)); echo "PASS: $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

# req METHOD URL [JSON_DATA] -> sets CODE / BODY; retries on curl failure or 503
req() {
  local method="$1" url="$2" data="${3:-}" out code body
  for i in 1 2 3 4; do
    if [ -n "$data" ]; then
      out=$(curl -s -w $'\n%{http_code}' -X "$method" -H "Content-Type: application/json" -d "$data" --max-time 90 "$BASE$url" 2>/dev/null)
    else
      out=$(curl -s -w $'\n%{http_code}' -X "$method" --max-time 90 "$BASE$url" 2>/dev/null)
    fi
    code="${out##*$'\n'}"
    body="${out%$'\n'*}"
    if [ "$code" != "000" ] && [ "$code" != "503" ]; then CODE="$code"; BODY="$body"; return 0; fi
    echo "   (attempt $i: HTTP $code — retrying in 8s)"
    sleep 8
  done
  CODE="$code"; BODY="$body"; return 1
}

chk() { # desc 'jq-condition on $BODY'
  local desc="$1" cond="$2"
  if jq -e "$cond" >/dev/null 2>&1 <<<"$BODY"; then ok "$desc"; else bad "$desc (body: $(echo "$BODY" | head -c 300))"; fi
}
chkcode() { # desc expected_code
  local desc="$1" want="$2"
  if [ "$CODE" = "$want" ]; then ok "$desc"; else bad "$desc (got HTTP $CODE, body: $(echo "$BODY" | head -c 300))"; fi
}

echo "=== 1. GET /api/categories ==="
req GET /api/categories
chkcode "categories: HTTP 200" 200
chk "categories: 8 items" 'length == 8'
chk "categories: all productCount > 0" 'all(.[]; .productCount > 0)'
chk "categories: sum(productCount) == 51" 'map(.productCount) | add == 51'
chk "categories: ordered by sortOrder" '[.[].sortOrder] == ([.[].sortOrder] | sort)'
chk "categories: first is cricket" '.[0].slug == "cricket"'

echo "=== 2. GET /api/products ==="
req GET "/api/products"
chkcode "products: HTTP 200" 200
chk "products: total == 51" '.total == 51'
chk "products: 12 items default limit" '.items | length == 12'
chk "products: pages == 5" '.pages == 5'
chk "products: page == 1" '.page == 1'
chk "products: item has full ProductListItem shape" '(.items[0] | has("id","slug","name","price","comparePrice","image","rating","reviewCount","badge","stock","brand","isNew","categoryId","sold"))'
chk "products: image is non-empty path" '.items[0].image | startswith("/images/")'

echo "=== 3. GET /api/products?category=cricket&sort=price-desc ==="
req GET "/api/products?category=cricket&sort=price-desc&limit=24"
chkcode "cricket price-desc: HTTP 200" 200
chk "cricket price-desc: 16 items" '.items | length == 16'
chk "cricket price-desc: total == 16" '.total == 16'
chk "cricket price-desc: first price is max" '.items | map(.price) | .[0] == max'
chk "cricket price-desc: non-increasing prices" '.items | map(.price) == (map(.price) | sort | reverse)'

echo "=== 4. GET /api/products?search=bat ==="
req GET "/api/products?search=bat&limit=24"
chkcode "search=bat: HTTP 200" 200
chk "search=bat: finds bats (total > 0)" '.total > 0'
chk "search=bat: every item matches name/brand ci" 'all(.items[]; (.name + " " + .brand) | ascii_downcase | contains("bat"))'
req GET "/api/products?search=BAT&limit=24"
chk "search=BAT (case-insensitive): total > 0" '.total > 0'

echo "=== 4b. filters: min/max, featured, isNew, popular sort, pagination ==="
req GET "/api/products?min=1000&max=5000&limit=24"
chk "min/max: all prices in [1000,5000]" 'all(.items[]; .price >= 1000 and .price <= 5000)'
req GET "/api/products?featured=1&limit=24"
chk "featured=1: total > 0" '.total > 0'
req GET "/api/products?isNew=1&limit=24"
chk "isNew=1: total > 0" '.total > 0'
req GET "/api/products?sort=popular&limit=5"
chk "sort=popular: sold non-increasing" '.items | map(.sold) == (map(.sold) | sort | reverse)'
req GET "/api/products?page=2&limit=12"
chk "page=2: page==2, 12 items" '.page == 2 and (.items | length) == 12'

echo "=== 5. GET /api/products/zameer-legend-2026 ==="
req GET "/api/products/zameer-legend-2026"
chkcode "legend detail: HTTP 200" 200
chk "legend: price == 42999" '.price == 42999'
chk "legend: related length == 4" '.related | length == 4'
chk "legend: categoryName == Cricket" '.categoryName == "Cricket"'
chk "legend: images is array" '.images | type == "array"'
chk "legend: specs object + tags array" '(.specs | type == "object") and (.tags | type == "array")'
LEGEND_ID=$(jq -r '.id' <<<"$BODY")
LEGEND_STOCK=$(jq -r '.stock' <<<"$BODY")
echo "  legend id=$LEGEND_ID baseline stock=$LEGEND_STOCK"

echo "=== 5b. GET /api/products/nonexistent-slug -> 404 ==="
req GET "/api/products/this-slug-does-not-exist"
chkcode "unknown slug: HTTP 404" 404

echo "=== 6. GET /api/settings + /api/testimonials ==="
req GET /api/settings
chkcode "settings: HTTP 200" 200
chk "settings: has canonical keys" 'has("store_name") and has("free_shipping_threshold") and has("currency")'
chk "settings: free_shipping_threshold == 5000" '.free_shipping_threshold == "5000"'
chk "settings: 17 keys" 'length == 17'
req GET /api/testimonials
chkcode "testimonials: HTTP 200" 200
chk "testimonials: 7 items" 'length == 7'
chk "testimonials: DTO shape" 'all(.[]; has("id","name","location","text","rating","image"))'

echo "=== 7. POST /api/newsletter ==="
req POST /api/newsletter '{"email":"apitest@zs.pk"}'
chkcode "newsletter: HTTP 201" 201
chk "newsletter: ok true" '.ok == true'
req POST /api/newsletter '{"email":"apitest@zs.pk"}'
chkcode "newsletter re-subscribe (upsert): HTTP 201" 201
req POST /api/newsletter '{"email":"not-an-email"}'
chkcode "newsletter invalid email: HTTP 400" 400

echo "=== 8. POST /api/contact ==="
req POST /api/contact '{"name":"API Test","phone":"03001234567","message":"Testing contact endpoint"}'
chkcode "contact: HTTP 201" 201
chk "contact: ok true" '.ok == true'
req POST /api/contact '{"name":"X","message":"hi"}'
chkcode "contact invalid payload: HTTP 400" 400

echo "=== 9. POST /api/reviews (legend) ==="
req POST /api/reviews "{\"productId\":\"$LEGEND_ID\",\"name\":\"API Tester\",\"rating\":5,\"comment\":\"Great bat, tested via API\"}"
chkcode "reviews POST: HTTP 201" 201
chk "reviews POST: ok true" '.ok == true'
chk "reviews POST: rating is a number" '.rating | type == "number"'
NEW_RATING=$(jq -r '.rating' <<<"$BODY"); NEW_COUNT=$(jq -r '.reviewCount' <<<"$BODY")
echo "  recalculated legend rating=$NEW_RATING reviewCount=$NEW_COUNT"
req GET "/api/reviews?productId=$LEGEND_ID"
chkcode "reviews GET: HTTP 200" 200
chk "reviews GET: newest first contains API Tester" '.[0].name == "API Tester"'
chk "reviews GET: DTO shape (createdAt ISO)" '.[0].createdAt | fromdate != null'
req POST /api/reviews "{\"productId\":\"$LEGEND_ID\",\"name\":\"B\",\"rating\":9,\"comment\":\"x\"}"
chkcode "reviews POST invalid: HTTP 400" 400
req GET "/api/reviews"
chkcode "reviews GET without productId: HTTP 400" 400

echo "=== 10. POST /api/orders ==="
req GET "/api/products/saki-power-bat"
SAKI_ID=$(jq -r '.id' <<<"$BODY"); SAKI_STOCK=$(jq -r '.stock' <<<"$BODY")
echo "  saki id=$SAKI_ID baseline stock=$SAKI_STOCK"
req POST /api/orders "{\"customerName\":\"API Test Order\",\"phone\":\"03001234567\",\"address\":\"Test Street 123, Near Board Chowk\",\"city\":\"Dinga\",\"items\":[{\"productId\":\"$LEGEND_ID\",\"qty\":1},{\"productId\":\"$SAKI_ID\",\"qty\":2}]}"
chkcode "orders POST: HTTP 201" 201
ORDER_NUMBER=$(jq -r '.orderNumber' <<<"$BODY")
echo "  created orderNumber=$ORDER_NUMBER body=$BODY"
chk "orders POST: orderNumber matches ZS pattern" '.orderNumber | test("^ZS[A-Z0-9]+$")'
SAKI_PRICE=$(curl -s --max-time 60 "$BASE/api/products/saki-power-bat" | jq -r '.price')
EXP_SUBTOTAL=$((42999 + SAKI_PRICE * 2))
chk "orders POST: subtotal correct ($EXP_SUBTOTAL)" ".subtotal == $EXP_SUBTOTAL"
chk "orders POST: free shipping (>= 5000)" '.shipping == 0'
chk "orders POST: total == subtotal + shipping" '.total == (.subtotal + .shipping)'
req POST /api/orders '{"customerName":"A","phone":"123","address":"short","city":"D","items":[]}'
chkcode "orders POST invalid: HTTP 400" 400
req POST /api/orders "{\"customerName\":\"Over Order\",\"phone\":\"03001234567\",\"address\":\"Some Long Enough Address 1\",\"city\":\"Dinga\",\"items\":[{\"productId\":\"$LEGEND_ID\",\"qty\":99}]}"
chkcode "orders POST qty>10: HTTP 400" 400

echo "=== 11-13. GET /api/orders/[orderNumber] ==="
req GET "/api/orders/$ORDER_NUMBER?phone=03001234567"
chkcode "order track: HTTP 200" 200
chk "order track: 2 items" '.items | length == 2'
chk "order track: status pending" '.status == "pending"'
chk "order track: paymentMethod cod" '.paymentMethod == "cod"'
chk "order track: item snapshot shape" 'all(.items[]; has("id","name","price","qty","image"))'
chk "order track: createdAt + updatedAt ISO present" 'has("createdAt") and has("updatedAt")'
req GET "/api/orders/$ORDER_NUMBER?phone=WRONG"
chkcode "order track wrong phone: HTTP 404" 404
req GET "/api/orders/ZSNOTREAL?phone=03001234567"
chkcode "order track unknown order: HTTP 404" 404
req GET "/api/orders/$ORDER_NUMBER"
chkcode "order track missing phone: HTTP 400" 400

echo "=== 14. stock/sold decrement verification ==="
req GET "/api/products/zameer-legend-2026"
chk "legend stock decremented by 1 ($((LEGEND_STOCK-1)))" ".stock == $((LEGEND_STOCK-1))"
chk "legend sold incremented by 1" '.sold == 321'
req GET "/api/products/saki-power-bat"
chk "saki stock decremented by 2 ($((SAKI_STOCK-2)))" ".stock == $((SAKI_STOCK-2))"

echo ""
echo "================================"
echo "RESULTS: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
