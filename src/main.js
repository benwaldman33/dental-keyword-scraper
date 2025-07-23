import { Actor } from 'apify';
import axios from 'axios';
import * as cheerio from 'cheerio';

await Actor.init();

const input = await Actor.getInput();
const { searchTerm = 'dentists', city = '', state = '', location = '', zipCodes = [], zipPrefixes = [], keywords, maxResults = 100, locationFilterStrictness = 'city_state_zip' } = input;

// Use city/state if provided, otherwise try to parse from location
let filterCity = city;
let filterState = state;
if ((!filterCity || !filterState) && location) {
    const match = location.match(/^(.*?),\s*([A-Za-z]{2})$/);
    if (match) {
        if (!filterCity) filterCity = match[1].trim();
        if (!filterState) filterState = match[2].trim();
    } else if (!filterCity) {
        filterCity = location.trim();
    }
}

if (!keywords || keywords.length === 0) {
    throw new Error('Keywords are required');
}

// Generate combined search query with AND logic
let searchQuery = searchTerm;
const locationParts = [];

if (location) locationParts.push(location);
if (zipCodes.length > 0) locationParts.push(...zipCodes);
if (zipPrefixes.length > 0) {
    // Generate zip codes from prefixes (simplified - you might want to expand this)
    zipPrefixes.forEach(prefix => {
        for (let i = 0; i < 100; i++) {
            locationParts.push(`${prefix}${i.toString().padStart(2, '0')}`);
        }
    });
}

// Combine all location parts with AND logic
if (locationParts.length > 0) {
    searchQuery += ` ${locationParts.join(' ')}`;
}

console.log(`Searching for: "${searchQuery}"`);

const results = [];

// Process the combined search
try {
    console.log(`Processing combined search: ${searchQuery}`);
    
    // Call Google Maps Scraper Actor with combined query
    const googleMapsResults = await callGoogleMapsScraper(searchQuery, '', maxResults);
    
    // Process each result
    for (const result of googleMapsResults) {
        try {
            // Filter results by zip code and state if specified
            if (!isResultInTargetLocation(result, filterCity, filterState, zipCodes, locationFilterStrictness)) {
                console.log(`Skipping result outside target location: ${result.name} - ${result.address}`);
                continue;
            }
            
            const websiteData = await fetchWebsiteData(result.website);
            const matchedKeywords = findMatchingKeywords(websiteData, keywords);
            
            if (matchedKeywords.length > 0) {
                results.push({
                    name: result.name,
                    address: result.address,
                    website: result.website,
                    phone: result.phone,
                    matchedKeywords,
                    location: locationParts.join(', '),
                    searchTerm
                });
            }
        } catch (error) {
            console.log(`Error processing website ${result.website}: ${error.message}`);
        }
    }
} catch (error) {
    console.log(`Error processing search: ${error.message}`);
}

// Push results to dataset
await Actor.pushData(results);

console.log(`Found ${results.length} results with matching keywords`);

await Actor.exit();

// Helper function to call Google Maps Scraper Actor
async function callGoogleMapsScraper(searchTerm, location, maxResults) {
    try {
        // Call the correct Google Maps Scraper Actor
        const input = {
            searchStringsArray: [searchTerm], // searchTerm now contains the full combined query
            maxCrawledPlacesPerQuery: maxResults,
            language: 'en',
            country: 'us'
        };
        
        console.log(`Calling compass/crawler-google-places with input:`, JSON.stringify(input));
        
        const run = await Actor.call('compass/crawler-google-places', input);
        console.log(`Run object:`, JSON.stringify(run));
        
        const datasetId = run.defaultDatasetId;
        if (!datasetId) {
            console.log('No dataset ID returned from scraper Actor.');
            return [];
        }
        
        console.log(`Dataset ID: ${datasetId}`);
        
        // Wait a moment for the dataset to be populated
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Fetch the results from the dataset
        const dataset = await Actor.openDataset(datasetId);
        console.log(`Dataset object:`, dataset);
        
        const data = await dataset.getData();
        console.log(`Raw data:`, data);
        const items = data.items || [];
        console.log(`Google Maps Scraper returned ${items.length} results`);
        
        // Check if items exist and is an array
        if (!Array.isArray(items)) {
            console.log('No items returned from dataset or items is not an array');
            return [];
        }
        
        // Transform the results to match our expected format
        return items.map(item => ({
            name: item.title || item.name,
            address: item.address,
            website: item.website,
            phone: item.phone
        }));
        
    } catch (error) {
        console.log(`Error calling Google Maps Scraper: ${error.message}`);
        console.log(`Full error:`, error);
        return [];
    }
}

// Helper function to fetch website data
async function fetchWebsiteData(url) {
    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        return {
            title: $('title').text(),
            metaDescription: $('meta[name="description"]').attr('content') || '',
            bodyText: $('body').text(),
            headings: $('h1, h2, h3, h4, h5, h6').map((i, el) => $(el).text()).get().join(' ')
        };
    } catch (error) {
        throw new Error(`Failed to fetch website: ${error.message}`);
    }
}

// Helper function to find matching keywords
function findMatchingKeywords(websiteData, keywords) {
    const content = `${websiteData.title} ${websiteData.metaDescription} ${websiteData.bodyText} ${websiteData.headings}`.toLowerCase();
    
    return keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
    );
}

// Helper function to filter results by location
function isResultInTargetLocation(result, city, state, zipCodes, strictness) {
    if (!result.address) return false;
    const address = result.address.toLowerCase();

    // Extract zip code from address using regex
    const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/);
    const addressZip = zipMatch ? zipMatch[0] : null;

    // Extract state (assume two-letter code)
    const stateMatch = address.match(/\b[a-z]{2}\b/gi);
    const addressState = stateMatch ? stateMatch[stateMatch.length - 1].toUpperCase() : null;

    // Always check city
    if (city && !address.includes(city.toLowerCase())) return false;

    if (strictness === "city_state" || strictness === "city_state_zip") {
        if (state && addressState !== state.toUpperCase()) return false;
    }
    if (strictness === "city_state_zip") {
        if (zipCodes && zipCodes.length > 0) {
            if (!addressZip || !zipCodes.includes(addressZip)) return false;
        }
    }
    return true;
}
