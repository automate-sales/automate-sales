export type CountryCodeDict = {
    [key: string]: {
        code: string,
        name: string,
        lengths: number[]
    }
}


export type PhoneNumberObj = {
    e164Format: string,
    countryCode: string,
    countryName: string,
    code: string,
    error?: string
}