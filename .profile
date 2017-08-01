echo "Updating PATH to include Salesforce CLI ..."
export PATH=$PATH:/app/.local/share/sfdx/cli/bin/

echo "Updating Salesforce CLI plugin ..."
sfdx update

echo "Installing JQ for JSON parsing ..."
wget -O jq https://github.com/stedolan/jq/releases/download/jq-1.5/jq-linux64
chmod +x ./jq

echo ""
export PATH=$PATH:/app/jq

echo "Completed!"