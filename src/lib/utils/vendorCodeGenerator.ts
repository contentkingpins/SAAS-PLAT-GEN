/**
 * Utility functions for auto-generating vendor codes and static codes
 */

/**
 * Generate a vendor code from the vendor name
 * @param name - The vendor name
 * @param isSubVendor - Whether this is a sub-vendor (affects prefix)
 * @returns Generated vendor code
 */
export function generateVendorCode(name: string, isSubVendor: boolean = false): string {
  // Remove common business suffixes and normalize
  const cleanName = name
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|company|co)\b/gi, '')
    .trim();

  // Extract meaningful words (remove articles, prepositions, etc.)
  const meaningfulWords = cleanName
    .split(/\s+/)
    .filter(word => !['the', 'and', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with'].includes(word.toLowerCase()))
    .filter(word => word.length > 0);

  let codeBase = '';

  if (meaningfulWords.length === 1) {
    // Single word: take first 3-4 characters
    codeBase = meaningfulWords[0].substring(0, 4).toUpperCase();
  } else if (meaningfulWords.length === 2) {
    // Two words: take first 2 chars from each
    codeBase = (meaningfulWords[0].substring(0, 2) + meaningfulWords[1].substring(0, 2)).toUpperCase();
  } else {
    // Multiple words: take first char from first 3-4 words
    codeBase = meaningfulWords
      .slice(0, 4)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  // Ensure minimum length of 3
  if (codeBase.length < 3) {
    codeBase = codeBase.padEnd(3, 'X');
  }

  // Add prefix for sub-vendors
  const prefix = isSubVendor ? 'SUB' : '';
  
  // Generate 3-digit random number for uniqueness
  const randomSuffix = String(Math.floor(Math.random() * 900) + 100);
  
  return `${prefix}${codeBase}${randomSuffix}`;
}

/**
 * Generate a static code from the vendor name
 * @param name - The vendor name
 * @param isSubVendor - Whether this is a sub-vendor
 * @returns Generated static code
 */
export function generateStaticCode(name: string, isSubVendor: boolean = false): string {
  // Similar to vendor code but with different format
  const cleanName = name
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|company|co)\b/gi, '')
    .trim();

  const words = cleanName.split(/\s+/).filter(word => word.length > 0);
  
  let staticBase = '';

  if (words.length === 1) {
    // Single word: take first 3 characters
    staticBase = words[0].substring(0, 3).toUpperCase();
  } else {
    // Multiple words: take first 2 chars from first word, 1 char from second
    staticBase = (words[0].substring(0, 2) + words[1]?.charAt(0) || 'X').toUpperCase();
  }

  // Ensure exactly 3 characters
  staticBase = staticBase.substring(0, 3).padEnd(3, 'X');

  // Add different number pattern for static codes
  const staticSuffix = String(Math.floor(Math.random() * 99) + 10).padStart(3, '0');
  
  const prefix = isSubVendor ? 'S' : '';
  
  return `${prefix}${staticBase}${staticSuffix}`;
}

/**
 * Check if a vendor code is already in use
 * @param code - The code to check
 * @param prisma - Prisma client instance
 * @returns Promise<boolean> - True if code exists
 */
export async function isVendorCodeTaken(code: string, prisma: any): Promise<boolean> {
  const existingVendor = await prisma.vendor.findFirst({
    where: { code: { equals: code, mode: 'insensitive' } },
    select: { id: true }
  });
  return !!existingVendor;
}

/**
 * Check if a static code is already in use
 * @param staticCode - The static code to check
 * @param prisma - Prisma client instance
 * @returns Promise<boolean> - True if static code exists
 */
export async function isStaticCodeTaken(staticCode: string, prisma: any): Promise<boolean> {
  const existingVendor = await prisma.vendor.findFirst({
    where: { staticCode: { equals: staticCode, mode: 'insensitive' } },
    select: { id: true }
  });
  return !!existingVendor;
}

/**
 * Generate unique vendor code with fallback attempts
 * @param name - The vendor name
 * @param isSubVendor - Whether this is a sub-vendor
 * @param prisma - Prisma client instance
 * @param maxAttempts - Maximum attempts to find unique code
 * @returns Promise<string> - Unique vendor code
 */
export async function generateUniqueVendorCode(
  name: string, 
  isSubVendor: boolean, 
  prisma: any, 
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateVendorCode(name, isSubVendor);
    const isTaken = await isVendorCodeTaken(code, prisma);
    
    if (!isTaken) {
      return code;
    }
  }
  
  // Fallback: use timestamp-based code
  const timestamp = Date.now().toString().slice(-6);
  const prefix = isSubVendor ? 'SUB' : '';
  return `${prefix}GEN${timestamp}`;
}

/**
 * Generate unique static code with fallback attempts
 * @param name - The vendor name
 * @param isSubVendor - Whether this is a sub-vendor
 * @param prisma - Prisma client instance
 * @param maxAttempts - Maximum attempts to find unique code
 * @returns Promise<string> - Unique static code
 */
export async function generateUniqueStaticCode(
  name: string, 
  isSubVendor: boolean, 
  prisma: any, 
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const staticCode = generateStaticCode(name, isSubVendor);
    const isTaken = await isStaticCodeTaken(staticCode, prisma);
    
    if (!isTaken) {
      return staticCode;
    }
  }
  
  // Fallback: use timestamp-based static code
  const timestamp = Date.now().toString().slice(-6);
  const prefix = isSubVendor ? 'S' : '';
  return `${prefix}ST${timestamp}`;
} 