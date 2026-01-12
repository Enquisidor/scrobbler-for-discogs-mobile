
import type { Credentials, DiscogsRelease, QueueItem, DiscogsArtist } from 'scrobbler-for-discogs-libs';
import { hmacSha1Base64, rfc3986encode as encode } from '../adapters/crypto';

// Custom Error types for specific API responses
export class DiscogsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscogsAuthError';
  }
}

export class DiscogsRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscogsRateLimitError';
  }
}


// Direct API Base URL - No Proxy
const API_BASE = 'https://api.discogs.com';

// IMPORTANT: Replace with your actual Discogs application credentials.
const CONSUMER_KEY = 'GwlBnzIstBUPmTsYjtgN';
const CONSUMER_SECRET = 'pfoWbAvyoguwrrhaSyCfGBPQAPpHNJVU';

interface CollectionResponse {
  pagination: {
    pages: number;
    page: number;
    items: number;
  };
  releases: DiscogsRelease[];
}

interface DiscogsIdentity {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}

// --- OAuth 1.0a Helpers ---

function generateOauthParams(
  method: string,
  url: string,
  params: Record<string, string>,
  token = '',
  tokenSecret = ''
): Record<string, string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: `${Date.now()}${Math.random().toString(36).substring(2)}`,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    ...(token && { oauth_token: token }),
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(key => `${encode(key)}=${encode(allParams[key])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encode(url)}&${encode(paramString)}`;
  const signingKey = `${encode(CONSUMER_SECRET)}&${encode(tokenSecret)}`;

  const signature = hmacSha1Base64(baseString, signingKey);
  oauthParams.oauth_signature = signature;

  return oauthParams;
}

// Helper utility for delays
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

async function discogsFetch(
  endpoint: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<any> {
    const [path, queryString] = endpoint.split('?');
    const url = `${API_BASE}${path}`;
    const queryParams = new URLSearchParams(queryString);
    const paramsObject: Record<string, string> = {};
    queryParams.forEach((value, key) => {
        paramsObject[key] = value;
    });

    const oauthParams = generateOauthParams('GET', url, paramsObject, accessToken, accessTokenSecret);
    
    const finalParams = new URLSearchParams({ ...paramsObject, ...oauthParams });
    const finalUrl = `${url}?${finalParams.toString()}`;

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            // Direct fetch to Discogs API (no CORS mode in React Native)
            const response = await fetch(finalUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'VinylScrobbler/1.0',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 401) {
                throw new DiscogsAuthError('Authentication failed. Please reconnect Discogs.');
            }

            if (response.status === 429 || response.status >= 500) {
                 const isRateLimit = response.status === 429;
                 const errorMessage = isRateLimit ? 'Rate limit exceeded' : `Server error ${response.status}`;
                 
                 attempt++;
                 if (attempt < MAX_RETRIES) {
                     const delay = BASE_DELAY * Math.pow(2, attempt - 1); 
                     console.warn(`[Discogs API] ${errorMessage}. Retrying in ${delay}ms... (Attempt ${attempt}/${MAX_RETRIES})`);
                     await wait(delay);
                     continue;
                 } else {
                     if (isRateLimit) throw new DiscogsRateLimitError('Discogs API rate limit exceeded after retries.');
                 }
            }

            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`Discogs API Error: ${errorData.message} (Status: ${response.status})`);

        } catch (error) {
            if (error instanceof DiscogsAuthError || error instanceof DiscogsRateLimitError) {
                throw error;
            }
            if (attempt === MAX_RETRIES - 1) {
                throw error;
            }
            attempt++;
            const delay = BASE_DELAY * Math.pow(2, attempt - 1);
            console.warn(`[Discogs API] Network error. Retrying in ${delay}ms... (Attempt ${attempt}/${MAX_RETRIES})`, error);
            await wait(delay);
        }
    }
}

// --- OAuth Flow Functions ---

export const getRequestToken = async (callbackUrl: string): Promise<{ requestToken: string; requestTokenSecret: string; authorizeUrl: string }> => {
  const url = `${API_BASE}/oauth/request_token`;
  const bodyParams = { oauth_callback: callbackUrl };
  const oauthParams = generateOauthParams('POST', url, bodyParams);
  const allParams = { ...bodyParams, ...oauthParams };
  
  const targetUrl = `${url}?${new URLSearchParams(allParams).toString()}`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'VinylScrobbler/1.0',
      'Accept': 'application/x-www-form-urlencoded'
    },
  });

  if (!response.ok) throw new Error('Failed to get Discogs request token. (Check CORS/Network)');
  
  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);
  
  const requestToken = responseParams.get('oauth_token');
  const requestTokenSecret = responseParams.get('oauth_token_secret');

  if (!requestToken || !requestTokenSecret) {
    throw new Error('Invalid request token response from Discogs.');
  }

  return {
    requestToken,
    requestTokenSecret,
    authorizeUrl: `https://www.discogs.com/oauth/authorize?oauth_token=${requestToken}`,
  };
};

export const getAccessToken = async (
  requestToken: string,
  requestTokenSecret: string,
  oauthVerifier: string
): Promise<{ accessToken: string; accessTokenSecret: string }> => {
  const url = `${API_BASE}/oauth/access_token`;
  const bodyParams = { oauth_verifier: oauthVerifier };
  const oauthParams = generateOauthParams('POST', url, bodyParams, requestToken, requestTokenSecret);
  const allParams = { ...bodyParams, ...oauthParams };

  const targetUrl = `${url}?${new URLSearchParams(allParams).toString()}`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'VinylScrobbler/1.0',
    },
  });

  if (!response.ok) throw new Error('Failed to get Discogs access token.');

  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);
  
  const accessToken = responseParams.get('oauth_token');
  const accessTokenSecret = responseParams.get('oauth_token_secret');
  
  if (!accessToken || !accessTokenSecret) {
    throw new Error('Invalid access token response from Discogs.');
  }

  return { accessToken, accessTokenSecret };
};

// --- API Functions ---

export const getDiscogsIdentity = async (accessToken: string, accessTokenSecret: string): Promise<DiscogsIdentity> => {
  return discogsFetch('/oauth/identity', accessToken, accessTokenSecret);
};

export const fetchDiscogsPage = async (
  username: string,
  accessToken: string,
  accessTokenSecret: string,
  page: number = 1,
  sort: string = 'added',
  sortOrder: 'asc' | 'desc' = 'desc',
  perPage: number = 50 
): Promise<{ releases: DiscogsRelease[]; pagination: CollectionResponse['pagination'] }> => {
    const endpoint = `/users/${username}/collection/folders/0/releases?page=${page}&per_page=${perPage}&sort=${sort}&sort_order=${sortOrder}`;
    const data: CollectionResponse = await discogsFetch(endpoint, accessToken, accessTokenSecret);
    
    // Return raw data so reducer can handle formatting
    return {
        releases: data.releases,
        pagination: data.pagination
    };
};

export const fetchReleaseTracklist = async (releaseId: number, accessToken: string, accessTokenSecret: string): Promise<QueueItem> => {
    const endpoint = `/releases/${releaseId}`;
    const releaseData = await discogsFetch(endpoint, accessToken, accessTokenSecret);
    return releaseData;
}
