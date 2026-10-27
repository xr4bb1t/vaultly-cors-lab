# Pinned Playwright image ships a matching Chromium that sends SameSite=None
# third-party cookies by default — the behaviour the credentialed attack needs.
FROM mcr.microsoft.com/playwright:v1.40.0-jammy
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 6000
CMD ["node", "bot.js"]
