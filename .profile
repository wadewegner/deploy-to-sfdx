echo "Updating PATH to include Salesforce CLI ..."
export PATH=$PATH:/app/.local/share/sfdx/cli/bin/

echo "Updating Salesforce CLI plugin ..."
sfdx update

echo "Installing JQ for JSON parsing ..."
apt-get install jq

echo "Completed!"