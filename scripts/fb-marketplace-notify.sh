#!/bin/bash

# Facebook Marketplace Couch Finder - Telegram Notification Script
# Usage: ./fb-marketplace-notify.sh "Title 1|Price 1|URL 1" "Title 2|Price 2|URL 2" ...

source .env

DEALS=("$@")

if [ ${#DEALS[@]} -eq 0 ]; then
  # No deals found
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=🛋️ No matching couches found today."
else
  # Format deals
  MESSAGE="*🛋️ Couch Deals - $(date +%b\ %d)*\n\n"
  
  for deal in "${DEALS[@]}"; do
    IFS='|' read -r title price url <<< "$deal"
    MESSAGE="${MESSAGE}💰 *${price}* - ${title}\n${url}\n\n"
  done
  
  MESSAGE="${MESSAGE}_Searched: Crate & Barrel, Room and Board in SF_"
  
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=${MESSAGE}"
fi
