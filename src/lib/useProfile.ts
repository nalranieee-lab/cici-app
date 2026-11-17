// filepath: src/lib/useProfile.ts
import { localFinance, localError, useLocalFinance } from './localFinance';
import type { LocalProfile } from './financeRepository';
export type Profile = LocalProfile;
const reload = async () => { localFinance.refresh(); };
const save = async (name: string, occupation: string) => { try { localFinance.saveProfile(name, occupation); return null; } catch (error) { return localError(error); } };
const saveBalance = async (balance: number) => { try { localFinance.saveBalance(balance); return null; } catch (error) { return localError(error); } };
export function useProfile() {
  const { data, error } = useLocalFinance();
  return { profile: data.profile, error: error ?? '', loading: false, reload, refresh: reload, save, saveBalance };
}
export const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'C';
