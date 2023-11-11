
import countryDict from './countryCodes'
import { PhoneNumberObj } from './types';
import { parse } from 'node-html-parser';

export function normalizePhoneNumber(
    phoneNumber: string, 
    countryCodeDict=countryDict
) {
    // Remove all non-digit characters
    if(!phoneNumber || phoneNumber.length < 3) return null
    let strippedNumber = phoneNumber.replace(/\D/g, '');
    let response = {
        e164Format: "",
        countryCode: "",
        countryName: "",
        code: ""
    } as PhoneNumberObj
    // Traverse the country codes dictionary to find a match
    for (let country in countryCodeDict) {
        let countryInfo = countryCodeDict[country];
        let code = countryInfo.code;
        let name = countryInfo.name;
        let lengths = countryInfo.lengths;

        // Check if the stripped number starts with a country code and the rest of the number is of valid length
        if (strippedNumber.startsWith(code) && lengths.includes(strippedNumber.length - code.length)) {
            response.e164Format = "+" + strippedNumber;
            response.countryCode = country;
            response.countryName = name;
            response.code = code;
            return response;
        }
    }
    // If no country code is found, assume it's Panama (507) if the number is exactly 8 digits long
    if (strippedNumber.length === 8) {
        response.e164Format = "+507" + strippedNumber;
        response.countryCode = "PA";
        response.countryName = "Panama";
        response.code = "507";
    }
    // If no country code is found, assume it's USA (1) if the number is exactly 10 digits long
    else if (strippedNumber.length === 10) {
        response.e164Format = "+1" + strippedNumber;
        response.countryCode = "US";
        response.countryName = "United States of America";
        response.code = "1";
    }
    // If the number is less than or equal to 8 digits and no country code is found, return it without any addition
    else if (strippedNumber.length <= 8) {
        response.e164Format = strippedNumber;
    } 
    // If the number is more than 8 digits and no country code is found, return an error
    else {
        response.error = "Invalid phone number.";
    }
    return response;
}


export const normalizeName =(name: string)=> {
    // Remove tildes
    let newName = name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Remove content in parentheses
    .replace(/\(.*?\)/g, '')
    // Trim leading/trailing spaces, convert all letters to lowercase, and replace multiple spaces with a single space
    .trim().toLowerCase().replace(/\s+/g, ' ');
    // Split the name into parts, capitalize the first letter of each part, and join them back together
    return newName.split(' ').map((word)=> {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

export const formatDate =(date: Date | string)=> {
    date = new Date(date);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

export const isLink =(text:string)=> {
    const potentialMatches = text.match(/https?:\/\/\S+/gi);
    if (!potentialMatches) return false;
    for (let match of potentialMatches) {
        try {
            const url = new URL(match);
            return url;
        } catch (e) {
            continue;
        }
    }
    return null;
}

export const getLinkProps = async(path: string | URL)=> {
    try {
        const url = new URL(path);
        const response = await fetch(path);
        const data = await response.text();
        const root = parse(data);
        const title = root.querySelector('meta[property="og:title"]')?.getAttribute('content') || root.querySelector('title')?.textContent || 'Undefined';
        const description = root.querySelector('meta[property="og:description"]')?.getAttribute('content') || root.querySelector('meta[name="description"]')?.getAttribute('content');
        let image = root.querySelector('meta[property="og:image"]')?.getAttribute('content') || root.querySelector('link[rel="icon"]')?.getAttribute('href') || root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
        
        // Construct full image URL if it's a relative path
        if (image && !image.startsWith('http')) {
            const basePath = url.origin
            image = basePath + image;
        }
  
        return {
            url: String(path),
            title,
            description,
            image
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch or parse the URL content.');
    }
}

export const getInitials =(name: string | null | undefined): string=> {
    return name ? name.split(' ').map(word => word.charAt(0).toUpperCase()).join('') : '?';
}