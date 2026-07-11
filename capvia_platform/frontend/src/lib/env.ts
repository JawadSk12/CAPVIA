export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    if (!isLocal) {
      return 'https://api.capvia.in/api/v1';
    }
  } else if (process.env.NODE_ENV === 'production') {
    return 'https://api.capvia.in/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

export const getAtsUrl = (): string => {
  if (process.env.NEXT_PUBLIC_ATS_URL) {
    return process.env.NEXT_PUBLIC_ATS_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    if (!isLocal) {
      return 'https://ats-api.capvia.in';
    }
  } else if (process.env.NODE_ENV === 'production') {
    return 'https://ats-api.capvia.in';
  }
  return 'http://localhost:8001';
};

export const API_URL = getApiUrl();
export const ATS_URL = getAtsUrl();
