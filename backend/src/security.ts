import { createHash,createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
const scrypt=promisify(scryptCallback);
export const randomToken=()=>randomBytes(32).toString('hex');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const commitment=(secret:string,...parts:string[])=>createHmac('sha256',secret).update(JSON.stringify(parts)).digest('hex');
export async function hashPassword(value:string){const salt=randomBytes(16).toString('hex');const key=await scrypt(value,salt,64) as Buffer;return `${salt}:${key.toString('hex')}`;}
export async function checkPassword(value:string,stored:string){const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const key=await scrypt(value,salt,64) as Buffer;const expected=Buffer.from(hash,'hex');return expected.length===key.length&&timingSafeEqual(expected,key);}
const reserved=new Set(['admin','api','support','ethereum','world','login','register','dashboard','wallet','learn','settings','root','moderator']);
export const usernameSchema=z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,23}$/).refine(v=>!reserved.has(v),'This username is reserved.');
export const passwordSchema=z.string().min(12).max(128);
export class HttpError extends Error {constructor(public status:number,message:string,public code='request_failed'){super(message);}}
export function requireValue<T>(value:T,message:string,status=404):NonNullable<T>{if(value==null)throw new HttpError(status,message);return value;}
