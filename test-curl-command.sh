#!/bin/bash

# Replace YOUR_JWT_TOKEN with actual JWT from Magic Hour dashboard
JWT_TOKEN="YOUR_JWT_TOKEN"
JOB_ID="cmce9sr6w13fgzk0z185b5qxb"

echo "Testing Magic Hour image retrieval with JWT..."

# Test different possible endpoints
endpoints=(
    "https://magichour.ai/api/image/$JOB_ID"
    "https://magichour.ai/api/v1/image/$JOB_ID"
    "https://magichour.ai/api/images/$JOB_ID"
    "https://magichour.ai/api/v1/images/$JOB_ID"
    "https://magichour.ai/api/download/$JOB_ID"
    "https://api.magichour.ai/image/$JOB_ID"
    "https://api.magichour.ai/download/$JOB_ID"
)

for endpoint in "${endpoints[@]}"; do
    echo ""
    echo "Testing: $endpoint"
    
    curl -s -I \
        -H "authority: magichour.ai" \
        -H "authorization: Bearer $JWT_TOKEN" \
        -H "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        -H "accept: image/*,*/*" \
        "$endpoint" | head -5
done

echo ""
echo "If any endpoint returns 200 OK with image content-type, use this command to download:"
echo "curl 'WORKING_ENDPOINT' -H 'authorization: Bearer $JWT_TOKEN' -o magic_hour_image.jpg" 