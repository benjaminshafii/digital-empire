#!/bin/bash

# Facebook Marketplace Couch Search Script
# Searches for Crate & Barrel and Room and Board couches under $2000 in San Francisco

set -e

# Source environment variables for Telegram
if [ -f .env ]; then
    source .env
fi

# Check required env vars
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env"
    exit 1
fi

# Search queries
declare -a QUERIES=(
    "crate%20and%20barrel%20sofa"
    "room%20and%20board%20sofa"
    "crate%20barrel%20couch"
    "room%20board%20couch"
)

# Results storage
RESULTS_FILE="/tmp/fb_marketplace_couches_$(date +%Y%m%d_%H%M%S).txt"
echo "🛋️ Facebook Marketplace Couch Search - $(date '+%b %d, %Y %H:%M')" > "$RESULTS_FILE"
echo "=============================================================\n" >> "$RESULTS_FILE"

FOUND_COUNT=0

echo "Searching Facebook Marketplace for couches..."

for QUERY in "${QUERIES[@]}"; do
    echo "  → Searching: ${QUERY//%20/ }"
    
    # Note: This requires manual extraction as FB Marketplace requires authentication
    # The URLs to check:
    URL="https://www.facebook.com/marketplace/sanfrancisco/search?query=$QUERY&maxPrice=2000"
    echo "    URL: $URL" >> "$RESULTS_FILE"
done

echo "" >> "$RESULTS_FILE"
echo "⚠️  Note: Facebook Marketplace requires browser-based access." >> "$RESULTS_FILE"
echo "Please use the browser MCP extension to complete this search." >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "Manual URLs to check:" >> "$RESULTS_FILE"
echo "1. https://www.facebook.com/marketplace/sanfrancisco/search?query=crate%20and%20barrel%20sofa&maxPrice=2000" >> "$RESULTS_FILE"
echo "2. https://www.facebook.com/marketplace/sanfrancisco/search?query=room%20and%20board%20sofa&maxPrice=2000" >> "$RESULTS_FILE"
echo "3. https://www.facebook.com/marketplace/sanfrancisco/search?query=crate%20barrel%20couch&maxPrice=2000" >> "$RESULTS_FILE"
echo "4. https://www.facebook.com/marketplace/sanfrancisco/search?query=room%20board%20couch&maxPrice=2000" >> "$RESULTS_FILE"

# Send notification via Telegram
MESSAGE="*🛋️ Facebook Marketplace Couch Search*
_$(date '+%b %d, %Y')_

⚠️ Browser MCP extension required to complete search.

*Search Terms:*
• Crate & Barrel sofa/couch
• Room and Board sofa/couch
• Max price: \$2,000
• Location: San Francisco

Please open Chrome with the OpenCode browser extension to run the automated search."

curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=$MESSAGE" > /dev/null

echo ""
echo "✓ Results saved to: $RESULTS_FILE"
echo "✓ Telegram notification sent"
