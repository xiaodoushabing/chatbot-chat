#!/usr/bin/env bash
set -e

ALIAS="chatbot-backoffice-lime.vercel.app"

echo "Deploying to production..."
OUTPUT=$(vercel --prod 2>&1 | tee /dev/stderr)

# Extract the deployment URL from the output
DEPLOY_URL=$(echo "$OUTPUT" | grep -oE 'https://chatbot-backoffice-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' | head -1)

if [ -z "$DEPLOY_URL" ]; then
  echo "Error: could not extract deployment URL from output"
  exit 1
fi

echo ""
echo "Pointing $ALIAS → $DEPLOY_URL"
vercel alias set "$DEPLOY_URL" "$ALIAS"
echo "Done. Live at https://$ALIAS"
