echo "Installing JQ for JSON parsing ..."

# mkdir /app/.local/share/jq/bin
# cd /app/.local/share/jq/bin
wget -O jq https://github.com/stedolan/jq/releases/download/jq-1.5/jq-linux64
chmod +x ./jq

# echo "Updating PATH to include jq ..."
# export PATH=$PATH:/app/.local/share/jq/bin

echo "Updating PATH to include Salesforce CLI ..."
export PATH=$PATH:/app/.local/share/sfdx/cli/bin/

# echo "Updating Salesforce CLI plugin ..."
# sfdx update

echo "Creating local resources ..."
mkdir /app/tmp

# echo $PATH

echo "Completed!"