#!/bin/bash

# Chainbridge User Action Simulation Script
# This script simulates real user interactions using curl commands

BASE_URL="http://localhost:3000"
DOMAIN="chaibridge.com"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Chainbridge User Action Simulation${NC}"
echo "============================================"

# Function to simulate user registration
simulate_registration() {
    local role=$1
    local email=$2
    local password="password123"
    
    echo -e "${GREEN}Registering ${role}: ${email}${NC}"
    
    curl -X POST "${BASE_URL}/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${password}\",
            \"name\": \"${email%@.*}\",
            \"role\": \"${role}\"
        }" \
        --silent --show-error --fail
}

# Function to simulate user login
simulate_login() {
    local email=$1
    local password="password123"
    
    echo -e "${GREEN}Logging in: ${email}${NC}"
    
    curl -X POST "${BASE_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${password}\"
        }" \
        --silent --show-error --fail
}

# Function to simulate product creation
simulate_create_product() {
    local seller_email=$1
    local product_name=$2
    local category=$3
    local price=$4
    local quantity=$5
    
    echo -e "${GREEN}Creating product: ${product_name}${NC}"
    
    curl -X POST "${BASE_URL}/api/products/create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${seller_email})" \
        -d "{
            \"name\": \"${product_name}\",
            \"category\": \"${category}\",
            \"unit\": \"kg\",
            \"pricePerUnit\": ${price},
            \"quantityAvailable\": ${quantity},
            \"description\": \"High-quality ${product_name} sourced from local farms\",
            \"imageUrl\": \"https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800\"
        }" \
        --silent --show-error --fail
}

# Function to simulate order creation
simulate_create_order() {
    local consumer_email=$1
    local product_id=$2
    local quantity=$3
    
    echo -e "${GREEN}Creating order for product ${product_id}${NC}"
    
    curl -X POST "${BASE_URL}/api/orders/create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${consumer_email})" \
        -d "{
            \"productId\": \"${product_id}\",
            \"quantity\": ${quantity},
            \"includeProcessing\": true,
            \"includePacking\": true,
            \"includeDelivery\": true
        }" \
        --silent --show-error --fail
}

# Function to simulate leg progression
simulate_leg_progression() {
    local worker_email=$1
    local leg_id=$2
    local action=$3
    
    echo -e "${GREEN}Worker ${worker_email} ${action} leg ${leg_id}${NC}"
    
    curl -X POST "${BASE_URL}/api/orders/leg/${action}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${worker_email})" \
        -d "{
            \"legId\": \"${leg_id}\"
        }" \
        --silent --show-error --fail
}

# Function to simulate payment initiation
simulate_payment() {
    local consumer_email=$1
    local order_id=$2
    local phone_number=$3
    
    echo -e "${GREEN}Initiating payment for order ${order_id}${NC}"
    
    curl -X POST "${BASE_URL}/api/mpesa/stk-push" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${consumer_email})" \
        -d "{
            \"orderId\": \"${order_id}\",
            \"phoneNumber\": \"${phone_number}\",
            \"amount\": 1000
        }" \
        --silent --show-error --fail
}

# Function to simulate dispute creation
simulate_dispute() {
    local user_email=$1
    local leg_id=$2
    local reason=$3
    
    echo -e "${GREEN}Raising dispute for leg ${leg_id}${NC}"
    
    curl -X POST "${BASE_URL}/api/disputes/raise" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${user_email})" \
        -d "{
            \"legId\": \"${leg_id}\",
            \"reason\": \"${reason}\"
        }" \
        --silent --show-error --fail
}

# Function to simulate admin actions
simulate_admin_verify() {
    local admin_email=$1
    local user_id=$2
    
    echo -e "${GREEN}Admin verifying user ${user_id}${NC}"
    
    curl -X POST "${BASE_URL}/api/admin/verify-user" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${admin_email})" \
        -d "{
            \"userId\": \"${user_id}\"
        }" \
        --silent --show-error --fail
}

simulate_admin_resolve_dispute() {
    local admin_email=$1
    local dispute_id=$2
    local resolution=$3
    
    echo -e "${GREEN}Admin resolving dispute ${dispute_id}${NC}"
    
    curl -X POST "${BASE_URL}/api/admin/resolve-dispute" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(simulate_login ${admin_email})" \
        -d "{
            \"disputeId\": \"${dispute_id}\",
            \"resolution\": \"${resolution}\",
            \"notes\": \"Reviewed evidence and approved resolution\"
        }" \
        --silent --show-error --fail
}

# Main simulation scenarios
echo -e "${BLUE}Scenario 1: Producer Registration and Product Listing${NC}"
simulate_registration "producer" "james.smith@${DOMAIN}"
simulate_registration "producer" "mary.johnson@${DOMAIN}"

echo -e "${BLUE}Scenario 2: Consumer Browsing and Order Placement${NC}"
simulate_registration "consumer" "john.williams@${DOMAIN}"
simulate_registration "consumer" "patricia.brown@${DOMAIN}"

echo -e "${BLUE}Scenario 3: Service Provider Registration${NC}"
simulate_registration "processor" "robert.garcia@${DOMAIN}"
simulate_registration "packer" "michael.miller@${DOMAIN}"
simulate_registration "delivery_agent" "william.davis@${DOMAIN}"

echo -e "${BLUE}Scenario 4: Retailer Registration${NC}"
simulate_registration "retailer" "elizabeth.wilson@${DOMAIN}"

echo -e "${BLUE}Scenario 5: Admin Registration${NC}"
simulate_registration "admin" "admin.admin@${DOMAIN}"

echo -e "${BLUE}Scenario 6: Admin Verification of Users${NC}"
# This would need actual user IDs from the database
# simulate_admin_verify "admin.admin@${DOMAIN}" "user-id-here"

echo "============================================"
echo -e "${GREEN}User action simulation completed${NC}"
echo "Note: This script provides a template for real API interactions"
echo "For full simulation, run the database seed script first"