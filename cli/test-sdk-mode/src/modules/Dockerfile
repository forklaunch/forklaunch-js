FROM node:23-alpine

# Set working directory
WORKDIR /test-sdk-mode

# Copy source code
COPY . .

# Install dependencies
RUN npm install -g pnpm
RUN apk update
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache git
RUN apk add --no-cache curl
RUN pnpm install

# Build TypeScript code
RUN pnpm types:build

RUN pnpm build