A powerful Apify Actor that scrapes dentists from Google Maps, fetches their websites, and filters results based on specified keywords in their content or metadata.

🎯 Purpose
This Actor helps identify dentists who offer specific services or use particular technologies by:

Searching Google Maps for dentists in specified locations
Fetching and analyzing their websites
Filtering results based on keyword presence in content/metadata
Outputting detailed results with matched keywords
🚀 Features
Flexible Search: Search by location, zip codes, or zip prefixes
Website Analysis: Fetches and parses dentist websites
Keyword Filtering: Searches for keywords in page content, meta descriptions, and titles
Comprehensive Output: Detailed results with contact info and matched keywords
Configurable Limits: Adjustable max results per location
Error Handling: Robust error handling and logging
📋 Input Schema
{
  "searchTerm": "dentists",
  "location": "Springfield, VA",
  "zipCodes": ["22153"],
  "zipPrefixes": ["100"],
  "keywords": ["cbct", "cone beam", "3D imaging"],
  "maxResults": 100
}

Input Fields
searchTerm: Google Maps search term (default: "dentists")
location: City/State/Region (e.g., "Springfield, VA")
zipCodes: Array of specific zip codes
zipPrefixes: 3-digit prefixes that generate full zip codes
keywords: Required array of keywords to search for
maxResults: Maximum results per location (1-500, default: 100)
📊 Output Format
Each result includes:

{
  "name": "Dentist Name",
  "address": "123 Main St, City, State",
  "website": "https://example.com",
  "phone": "(555) 123-4567",
  "matchedKeywords": ["cbct", "cone beam"],
  "location": "Springfield, VA",
  "searchTerm": "dentists"
}

🔧 Installation & Setup
Clone the repository:

git clone <repository-url>
cd dental-keyword-scraper

Install dependencies:

npm install

Deploy to Apify:

apify push

🏃‍♂️ Usage
Local Development
# Run locally
apify run

# Run with specific input
apify run --input input.json

Apify Platform
Go to your Actor in the Apify Console
Configure input parameters
Click "Start" to run
View results in the dataset
📝 Example Use Cases
Find CBCT Providers
{
  "searchTerm": "dentist",
  "location": "Springfield, VA",
  "keywords": ["cbct", "cone beam", "3D imaging", "3d scan"]
}

Find Orthodontists with Specific Services
{
  "searchTerm": "orthodontist",
  "zipCodes": ["22153", "22152"],
  "keywords": ["invisalign", "braces", "clear aligners"]
}

Regional Search with Zip Prefixes
{
  "searchTerm": "dental office",
  "zipPrefixes": ["100", "101"],
  "keywords": ["implant", "cosmetic", "whitening"]
}

🛠️ Technical Details
Platform: Apify Actor
Language: JavaScript (ES Modules)
Dependencies:
apify - Apify SDK v3
axios - HTTP client for website fetching
cheerio - HTML parsing
Architecture:
Calls Google Maps Scraper Actor
Fetches websites with axios
Parses HTML with cheerio
Filters by keyword presence
🔍 How It Works
Location Processing: Combines location and zip codes into search targets
Google Maps Scraping: Calls the Google Maps Scraper Actor for each location
Website Fetching: Downloads each dentist's website
Content Analysis: Parses HTML and extracts text/metadata
Keyword Matching: Searches for specified keywords in content
Result Filtering: Only returns dentists with matching keywords
Data Output: Pushes filtered results to dataset
📈 Performance
Concurrent Processing: Handles multiple locations efficiently
Timeout Handling: 15-second timeout for website requests
Error Resilience: Continues processing even if individual websites fail
Rate Limiting: Built-in delays to respect server limits
🤝 Contributing
Fork the repository
Create a feature branch
Make your changes
Test thoroughly
Submit a pull request
📄 License
This project is licensed under the MIT License.

🆘 Support
For issues or questions:

Check the Apify Console logs
Review the input schema
Ensure keywords are properly formatted
Verify location/zip code formats