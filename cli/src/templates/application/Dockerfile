{{#is_node}}FROM node:23-alpine{{/is_node}}{{#is_bun}}FROM oven/bun:1{{/is_bun}}

# Set working directory
WORKDIR /{{app_name}}

# Copy source code
COPY . .

# Install dependencies
{{#is_node}}RUN npm install -g pnpm
RUN apk add --no-cache git
RUN pnpm install{{/is_node}}{{#is_bun}}RUN bun install{{/is_bun}}
{{#is_node}}
# Build TypeScript code
RUN pnpm build{{/is_node}}
