/**
 * SSO Token System
 * 
 * Generates and validates JWT tokens for single sign-on between
 * management app and cloud deployment.
 */

import jwt from 'jsonwebtoken';

interface SSOTokenPayload {
  tenant_id: string;
  user_id: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate SSO token for accessing cloud deployment
 * 
 * @param payload - Tenant and user information
 * @returns JWT token string
 */
export function generateSSOToken(payload: Omit<SSOTokenPayload, 'iat' | 'exp'>): string {
  const secret = process.env.SSO_SECRET;
  
  if (!secret) {
    throw new Error('SSO_SECRET not configured');
  }
  
  return jwt.sign(
    payload,
    secret,
    {
      expiresIn: '15m',  // Token expires in 15 minutes
      issuer: 'ycode-cloud-management',
      audience: 'ycode-cloud-deployment'
    }
  );
}

/**
 * Validate SSO token
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function validateSSOToken(token: string): SSOTokenPayload | null {
  const secret = process.env.SSO_SECRET;
  
  if (!secret) {
    throw new Error('SSO_SECRET not configured');
  }
  
  try {
    const payload = jwt.verify(token, secret, {
      issuer: 'ycode-cloud-management',
      audience: 'ycode-cloud-deployment'
    }) as SSOTokenPayload;
    
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('SSO token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid SSO token');
    }
    return null;
  }
}

/**
 * Generate access URL with SSO token
 * 
 * @param tenantId - Tenant UUID
 * @param userId - User UUID  
 * @param email - User email
 * @returns Full URL to cloud deployment with token
 */
export function generateAccessURL(
  tenantId: string,
  userId: string,
  email: string
): string {
  const token = generateSSOToken({
    tenant_id: tenantId,
    user_id: userId,
    email
  });
  
  const deploymentUrl = process.env.NEXT_PUBLIC_CLOUD_DEPLOYMENT_URL || 'https://cloud.ycode.app';
  
  return `${deploymentUrl}?token=${token}`;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as SSOTokenPayload;
    if (!decoded || !decoded.exp) return true;
    
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as SSOTokenPayload;
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}

