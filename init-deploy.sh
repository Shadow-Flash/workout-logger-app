#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_message() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

if [ ! -f .env ]; then
  print_error ".env file not found. Creating a aws credential .env file."
  cat >.env <<EOL
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_SESSION_TOKEN=your_session_token_here
AWS_REGION=us-east-1

# Serverless Configuration
STAGE=dev

EOL
  print_message "credential .env created. Please edit it with your actual AWS credentials before running this script again."
  exit 1
fi

set -a
source .env
set +a

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_REGION" ] || [ -z "$AWS_SESSION_TOKEN" ]; then
  print_error "AWS credentials not properly set in .env file."
  print_message "Please ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, and AWS_REGION are set."
  exit 1
fi

print_message "Installing required NPM packages..."
npm install

print_message "Installing NPM packages for layer..."
cd layer/nodejs && npm install && cd ../../

# Ask user if they want to deploy
read -p "$(echo -e "${YELLOW}Do you want to deploy the serverless template now? (y/n)${NC} ")" choice

if [[ "$choice" =~ ^[Yy]$ ]]; then
  print_message "Deploying serverless template..."
  npm run deploy

  if [ $? -eq 0 ]; then
    print_message "Deployment completed successfully!"
  else
    print_error "Deployment failed. Please check the logs above for more information."
  fi
else
  print_message "Deployment skipped. You can deploy later using ${YELLOW}'npm run deploy'."
fi

print_message "Setup complete!"
