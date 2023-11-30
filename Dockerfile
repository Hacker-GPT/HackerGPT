# ---- Base Node ----
FROM node:19-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
RUN npm ci

# ---- Subfinder Builder ----
FROM golang:alpine AS subfinder-builder
# Install Git
RUN apk add --no-cache git
# Build Subfinder
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# ---- Build ----
FROM dependencies AS build
COPY . .
RUN npm run build

# ---- Production ----
FROM node:19-alpine AS production
WORKDIR /app

# Copy the Subfinder binary from the builder stage
COPY --from=subfinder-builder /go/bin/subfinder /usr/local/bin/subfinder

# Copy necessary files from previous stages
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/next-i18next.config.js ./next-i18next.config.js

# Copy the .env.local file if necessary
COPY .env.local .

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
