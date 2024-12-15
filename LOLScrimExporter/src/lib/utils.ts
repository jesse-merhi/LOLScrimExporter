import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getAuthToken = () => localStorage.getItem('authToken') || '';
export const getRefreshToken = () => localStorage.getItem('refreshToken') || '';
export const storeAuthToken = (token: string) =>
  localStorage.setItem('authToken', token);
export const storeRefreshToken = (token: string) =>
  localStorage.setItem('refreshToken', token);

export const santiseChampionNames = (championName: string) => {
  return championName
    .split(' ') // Split into words
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Title case each word
    )
    .join('') // Remove spaces
    .replace(/'/g, ''); // Remove apostrophes
};
