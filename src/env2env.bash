#!/bin/bash

# Define the path to your .env file
ENV_FILE=".env"

# Create or clear the .env file
> "$ENV_FILE"

# List of environment variables to export
variables=("DATABASE_URL" "API_KEY" "SECRET_KEY")

# Loop through each variable and append it to the .env file
for var in "${variables[@]}"; do
    if [ -n "${!var}" ]; then
        echo "$var=${!var}" >> "$ENV_FILE"
    else
        echo "$var is not set or is empty"
    fi
done