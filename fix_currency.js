
const fs = require("fs");
const path = require("path");

function getSymbolCode() {
  return `  const { user } = useAuth();
  const currencyCode = user?.organization?.settings?.currency || "USD";
  const currencyMap = {
    USD: "$", EUR: "€", GBP: "£", INR: "?", AED: "?.?",
    SAR: "?.?", CAD: "$", AUD: "$", JPY: "¥", CNY: "¥"
  };
  const currencySymbol = currencyMap[currencyCode] || currencyCode;`;
}

function processComponentBody(content) {
  // First ensure useAuth is imported
  if (!content.includes("useAuth")) {
    content = content.replace("import React", "import { useAuth } from \"../../context/AuthContext\";\nimport React");
  }

  // Define regexes for the different patterns
  
  // Pattern 1: $${...} inside template strings (e.g., QuotationDetailScreen HTML)
  content = content.replace(/\$\$\{(.*?)\}/g, "\\${currencySymbol} \\${$1}");
  
  // Pattern 2: Text wrapped with $ like <Text>${...}</Text>
  content = content.replace(/<Text([^>]*)>\$([\{\d].*?)<\/Text>/g, "<Text$1>{currencySymbol} $2</Text>");
  
  // Pattern 3: Similar, inside strings like Balance due ${...}
  content = content.replace(/Balance due \$\{(.*?)\}/g, "Balance due {currencySymbol} \\${$1}");
  content = content.replace(/Total: \$\{(.*?)\}/g, "Total: {currencySymbol} \\${$1}");

  return content;
}

const dir = "d:/personal/inventory/mobile-erp/screens";
function walk(directory) {
  const list = fs.readdirSync(directory);
  for (let item of list) {
    if (item.startsWith(".")) continue;
    const fullPath = path.join(directory, item);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8");
      if (content.includes("$")) {
        console.log("Analyzing", fullPath);
      }
    }
  }
}

walk(dir);

